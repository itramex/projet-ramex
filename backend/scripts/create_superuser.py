# scripts/create_superuser.py
import os
import django
import sys

# Configuration Django
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_superuser():
    User = get_user_model()
    username = os.environ.get('SUPERUSER_USERNAME', 'manda')
    email = os.environ.get('SUPERUSER_EMAIL', 'msrazafi@protonmail.com')
    password = os.environ.get('SUPERUSER_PASSWORD', 'sarobidy')
    
    if not User.objects.filter(username=username).exists():
        User.objects.create_superuser(username=username, email=email, password=password)
        print(f"✅ Superutilisateur créé: {username} / {password}")
    else:
        print("ℹ️  Superutilisateur existe déjà")

if __name__ == '__main__':
    create_superuser()