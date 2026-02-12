"""
Database configuration for seeding scripts.
Update these values with your actual database credentials.
"""

DB_CONFIG = {
    'host': 'localhost',
    'database': 'loqo_db',
    'user': 'postgres',
    'password': 'your_password_here',
    'port': 5432
}

"""
MongoDB configuration for seeding scripts.
Update these values with your actual database credentials.
"""

MONGO_CONFIG = {
    'host': 'localhost',
    'port': 27017,
    'database': 'loqo_db',
    # Uncomment and update if authentication is required
    'username': 'root',
    'password': 'examplepassword',
}
