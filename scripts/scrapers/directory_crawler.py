"""
Python Enterprise Micro-Scraper: Directory & Portal Crawler
Extracts structured company records, unmasks decision-makers from HTML title attributes,
and streams records into JSON format or MongoDB.
Usage: python scripts/scrapers/directory_crawler.py "https://www.maharashtradirectory.com/product/punch-clamps.html"
"""

import sys
import re
import json
import urllib.request
from html.parser import HTMLParser

class ListingExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.cards = []
        self.current_title = ""
        self.current_href = ""
        self.current_text = []
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == "a":
            title = attr_dict.get("title", "")
            href = attr_dict.get("href", "")
            if "Contact:" in title or "contact:" in title:
                self.current_title = title
                self.current_href = href
                self.in_title = True

    def handle_data(self, data):
        if self.in_title:
            self.current_text.append(data.strip())

    def handle_endtag(self, tag):
        if tag == "a" and self.in_title:
            name = " ".join(self.current_text).strip()
            if name:
                contact_person = ""
                designation = "Executive"
                raw = re.sub(r'^Contact:\s*', '', self.current_title, flags=re.I).strip()
                desig_match = re.search(r'\(([^)]+)\)$', raw)
                if desig_match:
                    designation = desig_match.group(1).strip()
                    contact_person = re.sub(r'\(([^)]+)\)$', '', raw).strip()
                else:
                    contact_person = raw

                self.cards.append({
                    "company_name": name,
                    "contact_person": contact_person,
                    "designation": designation,
                    "profile_href": self.current_href,
                    "raw_title": self.current_title
                })
            self.in_title = False
            self.current_text = []

def crawl(url):
    print(f"[Python Scraper] Crawling: {url}")
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36"
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            parser = ListingExtractor()
            parser.feed(html)
            print(f"[Python Scraper] Extracted {len(parser.cards)} unmasked records:")
            print(json.dumps(parser.cards, indent=2))
            return parser.cards
    except Exception as e:
        print(f"[Python Scraper Error] {e}")
        return []

if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else "https://www.maharashtradirectory.com/product/punch-clamps.html"
    crawl(target)

