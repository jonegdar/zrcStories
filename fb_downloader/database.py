from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import datetime
import json

# SQLite database file
SQLALCHEMY_DATABASE_URL = "sqlite:///./fb_articles.db"

# Create the SQLAlchemy engine
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

# Create a SessionLocal class for database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our models
Base = declarative_base()

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    fb_url = Column(String, index=True)
    text = Column(Text)
    images = Column(Text) # Stored as JSON string
    video = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

# Create the tables in the database
def init_db():
    Base.metadata.create_all(bind=engine)

# Dependency to get the database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
