from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager
 
# Custom User Manager to handle user creation
class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        """
        Create and return a regular user with an email and password.
        """
        if not email:
            raise ValueError('The Email field must be set')
 
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)  # Hash the password
        user.save(using=self._db)
        return user
 
    def create_superuser(self, email, password=None, **extra_fields):
        """
        Create and return a superuser with an email and password.
        """
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
 
        return self.create_user(email, password, **extra_fields)
 
 
# Custom User model that extends AbstractBaseUser
class User(AbstractBaseUser):
    # Fields
    email = models.EmailField(unique=True)  # Unique email for the user
    name = models.CharField(max_length=100)
    password = models.CharField(max_length=255)  # Password will be hashed using set_password
    secret = models.CharField(max_length=32)
    access = models.CharField(max_length=50)
 
    # Permissions
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_superuser = models.BooleanField(default=False)
 
    # Timestamps
    last_login = models.DateTimeField(auto_now=True)
    date_joined = models.DateTimeField(auto_now_add=True)
 
    # Custom Manager
    objects = CustomUserManager()
 
    # Define the USERNAME_FIELD and REQUIRED_FIELDS
    USERNAME_FIELD = 'email'  # Use email for authentication
    REQUIRED_FIELDS = ['name']  # Fields required when creating a superuser
 
    # Meta class for app label
    class Meta:
        app_label = 'backend_app'
 
    def __str__(self):
        return self.email  # Return the user's email as the string representation
 
    # You can add any custom methods to the User model here
 
    @property
    def full_name(self):
        return f'{self.name} ({self.email})'
 
    def __str__(self):
        return self.filename
    
class EncryptedFile(models.Model):
    email = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        to_field='email',
        related_name='encrypted_files'
    )
    filename = models.CharField(max_length=255,unique=True)
    encrypted_file = models.BinaryField()
    encryption_key = models.BinaryField()
    iv = models.BinaryField(null=True)

    class Meta:
        unique_together = ('email', 'filename')

class FileSharingInfo(models.Model):
    sender = models.EmailField(max_length=255)
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        to_field='email',
        related_name='file_sharing_info'
    )
    file = models.ForeignKey(
        EncryptedFile,
        on_delete=models.CASCADE,
        to_field='filename',
        related_name='file_sharing_info'
    )
    permission = models.CharField(max_length=255)


class E2EEKeyProfile(models.Model):
    """
    Public key plus a password-encrypted private-key bundle.
    The plaintext private key and encryption password must never reach Django.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="e2ee_key_profile",
    )
    public_key_pem = models.TextField()
    protected_private_key = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"E2EE keys for {self.user.email}"
