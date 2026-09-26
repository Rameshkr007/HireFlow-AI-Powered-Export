import csv
import io
from typing import List, Dict, Tuple, Any

EXPECTED_COLUMNS = [
    "buyer_name", "company_name", "email", "website",
    "country", "source_platform", "business_type",
    "page_url", "product", "company_description", "phone"
]

def parse_buyer_csv(file_content: bytes) -> List[Dict[str, Any]]:
    """Parse CSV bytes into list of dicts."""
    content = file_content.decode('utf-8-sig')  # handle BOM
    reader = csv.DictReader(io.StringIO(content))
    rows = []
    for row in reader:
        # normalize keys to lowercase and strip
        normalized = {k.lower().strip(): v.strip() if isinstance(v, str) else v 
                     for k, v in row.items()}
        rows.append(normalized)
    return rows

def validate_csv_row(row: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """Validate a single CSV row. Returns (is_valid, errors)."""
    errors = []
    # Must have at least email or company_name
    if not row.get('email') and not row.get('company_name'):
        errors.append("Row must have at least email or company_name")
    return len(errors) == 0, errors

def buyers_to_csv(buyers: List[Dict[str, Any]]) -> str:
    """Convert list of buyer dicts to CSV string."""
    if not buyers:
        return ""
    output = io.StringIO()
    fieldnames = list(buyers[0].keys())
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(buyers)
    return output.getvalue()
