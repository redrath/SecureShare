import base64
import binascii

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .e2ee_auth import E2EEJWTAuthentication
from .models import E2EEFile, E2EEKeyProfile, E2EERecipientKey, User


MAX_ENCRYPTED_FILE_BYTES = 26 * 1024 * 1024


def decode_base64(value, field_name):
    if not isinstance(value, str) or not value:
        raise ValueError(f"{field_name} must be a base64 string.")
    try:
        return base64.b64decode(value, validate=True)
    except (binascii.Error, ValueError):
        raise ValueError(f"{field_name} is not valid base64.")


class E2EEBaseView(APIView):
    authentication_classes = [E2EEJWTAuthentication]
    permission_classes = [IsAuthenticated]


class MyE2EEKeysView(E2EEBaseView):
    def get(self, request):
        profile = E2EEKeyProfile.objects.filter(user=request.user).first()
        if not profile:
            return Response({"has_keys": False}, status=status.HTTP_200_OK)
        return Response({
            "has_keys": True,
            "public_key_pem": profile.public_key_pem,
            "protected_private_key": profile.protected_private_key,
        })

    def post(self, request):
        public_key = request.data.get("public_key_pem")
        protected_key = request.data.get("protected_private_key")
        if not isinstance(public_key, str) or "BEGIN PUBLIC KEY" not in public_key:
            return Response({"detail": "A valid public key is required."}, status=400)
        if not isinstance(protected_key, dict) or not all(
            isinstance(protected_key.get(field), str)
            for field in ("salt", "iv", "ciphertext")
        ):
            return Response({"detail": "The protected private-key data is incomplete."}, status=400)
        if len(public_key) > 10000 or len(str(protected_key)) > 50000:
            return Response({"detail": "Key data is too large."}, status=400)

        if E2EEKeyProfile.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Encryption keys already exist. Key replacement needs a safe recovery process."},
                status=409,
            )
        E2EEKeyProfile.objects.create(
            user=request.user,
            public_key_pem=public_key,
            protected_private_key=protected_key,
        )
        return Response({"message": "Your encryption keys have been saved."}, status=201)


class E2EEPublicKeyView(E2EEBaseView):
    def get(self, request, email):
        recipient = get_object_or_404(User, email__iexact=email, is_active=True)
        profile = E2EEKeyProfile.objects.filter(user=recipient).first()
        if not profile:
            return Response({"detail": "This user has not set up file encryption yet."}, status=404)
        return Response({
            "email": recipient.email,
            "public_key_pem": profile.public_key_pem,
        })


class E2EEFileListCreateView(E2EEBaseView):
    def get(self, request):
        owned = E2EEFile.objects.filter(owner=request.user).order_by("-created_at")
        received_ids = E2EERecipientKey.objects.filter(
            recipient=request.user
        ).values_list("file_id", flat=True)
        received = E2EEFile.objects.filter(id__in=received_ids).order_by("-created_at")
        files = {}
        for item in list(owned) + list(received):
            files[item.id] = {
                "id": item.id,
                "filename": item.filename,
                "owner": item.owner.email,
                "created_at": item.created_at,
                "original_size": item.original_size,
                "is_owner": item.owner_id == request.user.id,
            }
        return Response({"files": list(files.values())})

    def post(self, request):
        filename = request.data.get("filename")
        iv = request.data.get("iv")
        encrypted_key = request.data.get("encrypted_key")
        ciphertext_text = request.data.get("ciphertext")
        if not all(isinstance(value, str) and value for value in (filename, iv, encrypted_key, ciphertext_text)):
            return Response({"detail": "Filename, IV, encrypted key and encrypted file are required."}, status=400)
        if len(filename) > 255 or len(iv) > 128 or len(encrypted_key) > 10000:
            return Response({"detail": "One of the fields is too large."}, status=400)
        try:
            ciphertext = decode_base64(ciphertext_text, "ciphertext")
        except ValueError as error:
            return Response({"detail": str(error)}, status=400)
        if not ciphertext or len(ciphertext) > MAX_ENCRYPTED_FILE_BYTES:
            return Response({"detail": "Encrypted files must be between 1 byte and 25 MB."}, status=400)

        if not E2EEKeyProfile.objects.filter(user=request.user).exists():
            return Response({"detail": "Set up your encryption keys before uploading."}, status=400)

        try:
            original_size = int(request.data.get("original_size", 0))
            if original_size < 0:
                raise ValueError
        except (TypeError, ValueError):
            return Response({"detail": "Original file size must be a valid positive number."}, status=400)

        with transaction.atomic():
            encrypted_file = E2EEFile.objects.create(
                owner=request.user,
                filename=filename,
                ciphertext=ciphertext,
                iv=iv,
                content_type=request.data.get("content_type", "application/octet-stream")[:255],
                original_size=original_size,
            )
            E2EERecipientKey.objects.create(
                file=encrypted_file,
                recipient=request.user,
                encrypted_key=encrypted_key,
            )
        return Response({"id": encrypted_file.id, "message": "Encrypted file uploaded."}, status=201)


class E2EEFileDetailView(E2EEBaseView):
    def get(self, request, file_id):
        encrypted_file = get_object_or_404(E2EEFile, pk=file_id)
        envelope = E2EERecipientKey.objects.filter(
            file=encrypted_file, recipient=request.user
        ).first()
        if not envelope:
            return Response({"detail": "You do not have permission to open this file."}, status=403)
        return Response({
            "id": encrypted_file.id,
            "filename": encrypted_file.filename,
            "ciphertext": base64.b64encode(bytes(encrypted_file.ciphertext)).decode("ascii"),
            "iv": encrypted_file.iv,
            "encrypted_key": envelope.encrypted_key,
            "content_type": encrypted_file.content_type,
            "original_size": encrypted_file.original_size,
        })


class E2EEShareFileView(E2EEBaseView):
    def post(self, request, file_id):
        encrypted_file = get_object_or_404(E2EEFile, pk=file_id, owner=request.user)
        email = request.data.get("recipient_email")
        encrypted_key = request.data.get("encrypted_key")
        if not isinstance(email, str) or not email.strip() or not isinstance(encrypted_key, str) or not encrypted_key:
            return Response({"detail": "Recipient email and encrypted file key are required."}, status=400)
        recipient = get_object_or_404(User, email__iexact=email.strip(), is_active=True)
        if not E2EEKeyProfile.objects.filter(user=recipient).exists():
            return Response({"detail": "The recipient has not set up file encryption yet."}, status=400)
        if recipient.id == request.user.id:
            return Response({"detail": "This file is already available to you."}, status=400)
        E2EERecipientKey.objects.update_or_create(
            file=encrypted_file,
            recipient=recipient,
            defaults={"encrypted_key": encrypted_key},
        )
        return Response({"message": "File shared with the recipient."}, status=201)
