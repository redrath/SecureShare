from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager

# Custom User Manager to handle user creation
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=100)
    password = models.CharField(max_length=255)
    secret = models.CharField(max_length=32)
    access = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
    last_login = models.DateTimeField(auto_now=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    objects = CustomUserManager()
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    class Meta:
        app_label = 'backend_app'

    @property
    def full_name(self):
        return f'{self.name} ({self.email})'

    def __str__(self):
        return self.email


class EncryptedFile(models.Model):
    email = models.ForeignKey(User, on_delete=models.CASCADE, to_field='email', related_name='encrypted_files')
    filename = models.CharField(max_length=255, unique=True)
    encrypted_file = models.BinaryField()
    encryption_key = models.BinaryField()
    iv = models.BinaryField(null=True)

    class Meta:
        unique_together = ('email', 'filename')


class FileSharingInfo(models.Model):
    sender = models.EmailField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE, to_field='email', related_name='file_sharing_info')
    file = models.ForeignKey(EncryptedFile, on_delete=models.CASCADE, to_field='filename', related_name='file_sharing_info')
    permission = models.CharField(max_length=255)


class E2EEKeyProfile(models.Model):
    """Stores a public key and a private-key file protected in the user's browser."""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="e2ee_key_profile")
    public_key_pem = models.TextField()
    protected_private_key = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"E2EE keys for {self.user.email}"


class E2EEFile(models.Model):
    """The server stores encrypted bytes only; it never receives the file key."""
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="e2ee_owned_files")
    filename = models.CharField(max_length=255)
    ciphertext = models.BinaryField()
    iv = models.CharField(max_length=128)
    content_type = models.CharField(max_length=255, default="application/octet-stream")
    original_size = models.PositiveBigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)


class E2EERecipientKey(models.Model):
    """One encrypted copy of the file key for each person allowed to open it."""
    file = models.ForeignKey(E2EEFile, on_delete=models.CASCADE, related_name="recipient_keys")
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="e2ee_received_keys")
    encrypted_key = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["file", "recipient"], name="unique_e2ee_file_recipient")
        ]
