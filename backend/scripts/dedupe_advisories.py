from collections import defaultdict
from pathlib import Path
import sys


sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.database import SessionLocal
from app.models.models import Advisory


def main() -> None:
    db = SessionLocal()
    try:
        advisories = db.query(Advisory).order_by(Advisory.collection_date.desc(), Advisory.id.desc()).all()
        before_count = len(advisories)
        latest_by_key: dict[tuple[str, str], Advisory] = {}
        duplicate_ids: list[int] = []

        for advisory in advisories:
            if not advisory.cve:
                continue
            key = (advisory.cve, advisory.source_domain or '')
            if key in latest_by_key:
                duplicate_ids.append(advisory.id)
            else:
                latest_by_key[key] = advisory

        if duplicate_ids:
            db.query(Advisory).filter(Advisory.id.in_(duplicate_ids)).delete(synchronize_session=False)
            db.commit()

        after_count = db.query(Advisory).count()
        print(f'Advisory rows before: {before_count}')
        print(f'Duplicate rows deleted: {len(duplicate_ids)}')
        print(f'Advisory rows after: {after_count}')
    finally:
        db.close()


if __name__ == '__main__':
    main()
