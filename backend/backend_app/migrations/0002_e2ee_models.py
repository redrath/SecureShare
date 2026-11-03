from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("backend_app", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="E2EEKeyProfile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_key_pem", models.TextField()),
                ("protected_private_key", models.JSONField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("user", models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name="e2ee_key_profile", to="backend_app.user")),
            ],
        ),
        migrations.CreateModel(
            name="E2EEFile",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("filename", models.CharField(max_length=255)),
                ("ciphertext", models.BinaryField()),
                ("iv", models.CharField(max_length=128)),
                ("content_type", models.CharField(default="application/octet-stream", max_length=255)),
                ("original_size", models.PositiveBigIntegerField(default=0)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="e2ee_owned_files", to="backend_app.user")),
            ],
        ),
        migrations.CreateModel(
            name="E2EERecipientKey",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("encrypted_key", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("file", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="recipient_keys", to="backend_app.e2eefile")),
                ("recipient", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="e2ee_received_keys", to="backend_app.user")),
            ],
        ),
        migrations.AddConstraint(
            model_name="e2eerecipientkey",
            constraint=models.UniqueConstraint(fields=("file", "recipient"), name="unique_e2ee_file_recipient"),
        ),
    ]
