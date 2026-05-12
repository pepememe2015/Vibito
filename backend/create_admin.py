import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models import SessionLocal, User
from auth import hash_password

def create_admin():
    db = SessionLocal()
    
    # Check if admin already exists
    admin = db.query(User).filter(User.username == "admin").first()
    if admin:
        print(f"✅ Admin already exists! Username: {admin.username}")
        print(f"   Role: {'Admin' if admin.is_admin else 'User'}")
        if not admin.is_admin:
            admin.is_admin = True
            db.commit()
            print("   ✅ User promoted to admin!")
    else:
        # Create new admin
        admin = User(
            username="admin",
            hashed_password=hash_password("admin123"),
            is_admin=True
        )
        db.add(admin)
        db.commit()
        print("✅ Admin created successfully!")
        print("   Username: admin")
        print("   Password: admin123")
    
    # List all users
    print("\n📋 All users in database:")
    users = db.query(User).all()
    for u in users:
        print(f"   - {u.username} (ID: {u.id}, Admin: {u.is_admin})")
    
    db.close()

if __name__ == "__main__":
    create_admin()