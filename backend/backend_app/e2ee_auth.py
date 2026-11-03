from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import User


class E2EEJWTAuthentication(BaseAuthentication):
    """
    Authenticate existing SimpleJWT access tokens against backend_app.User.
    The project has not configured backend_app.User as AUTH_USER_MODEL, so
    the default SimpleJWT user lookup would use Django's unrelated user table.
    """

    jwt_authentication = JWTAuthentication()

    def authenticate(self, request):
        header = self.jwt_authentication.get_header(request)
        if header is None:
            return None

        raw_token = self.jwt_authentication.get_raw_token(header)
        if raw_token is None:
            return None

        token = self.jwt_authentication.get_validated_token(raw_token)
        try:
            user = User.objects.get(pk=token["user_id"], is_active=True)
        except (User.DoesNotExist, KeyError, TypeError, ValueError):
            raise AuthenticationFailed("Invalid user for this access token.")

        return user, token
