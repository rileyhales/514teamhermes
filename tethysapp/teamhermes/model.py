from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, JSON, DateTime

from .app import Teamhermes as app

Base = declarative_base()


class Graphics(Base):
    """
    SQLAlchemy Graphics DB Model
    """
    __tablename__ = 'graphics'

    # Columns
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer)
    graphics = Column(JSON)
    time = Column(DateTime)


def init_primary_db(engine, first_time):
    """
    Initializer for the primary database.
    """
    # Create all the tables
    Base.metadata.create_all(engine)


def store_graphics(graphics_json, userid, time):
    """
    Persist new graphics.
    """
    # Create new Dam record
    new_graphics = Graphics(
        user_id=userid,
        graphics=graphics_json,
        time=time,
    )

    # Get connection/session to database
    Session = app.get_persistent_store_database('primary_db', as_sessionmaker=True)
    session = Session()

    # Add the new dam record to the session
    session.add(new_graphics)

    # Commit the session and close the connection
    session.commit()
    session.close()
