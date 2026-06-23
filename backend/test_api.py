import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import asyncio
from database import SessionLocal
from schemas import TaskParseRequest
from routes.tasks import parse_tasks_endpoint

async def run():
    db = SessionLocal()
    req = TaskParseRequest(text="test")
    try:
        res = await parse_tasks_endpoint(req, db)
        print("Success:", res)
    except Exception as e:
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run())
