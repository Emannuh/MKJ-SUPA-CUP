from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0021_add_magic_login_token'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='current_session_key',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Session key of the currently active login session (enforces single-session)',
                max_length=40,
            ),
        ),
    ]
