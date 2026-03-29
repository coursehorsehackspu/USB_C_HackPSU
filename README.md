# 🎓 DegreeFlow — PSU Universal Web Harvester

A recursive web scraper that crawls **all of psu.edu** (and its subdomains),
extracts every type of content, and stores it in MongoDB to power an AI
Counselor Agent.

---

## 📁 File Structure

```
degreeflow_scraper/
├── config.py          ← Settings (URLs, depth, MongoDB, rate limits)
├── crawler.py         ← Recursive link surfer
├── extractor.py       ← Pulls all content from each page
├── mongo_loader.py    ← MongoDB connection, upserts, indexes
├── run.py             ← Entry point (run this)
├── requirements.txt   ← Python dependencies
└── README.md          ← This file
```

---

## ⚙️ Setup

### 1. Install Python dependencies
```bash
pip install -r requirements.txt
```

### 2. Install & start MongoDB
- **Mac:** `brew install mongodb-community && brew services start mongodb-community`
- **Windows:** Download from https://www.mongodb.com/try/download/community
- **Linux:** `sudo apt install mongodb && sudo systemctl start mongodb`

### 3. (Optional) Set your contact email in config.py
```python
USER_AGENT = "DegreeFlow-Scraper/1.0 (Academic Research Bot; contact: YOU@email.com)"
```

---

## 🚀 Running the Scraper

### Full crawl (start → surf → store everything)
```bash
python run.py
```

### Quick test (shallow crawl, 50 pages)
```bash
python run.py --depth 2 --max 50
```

### Check what's been stored so far
```bash
python run.py --stats
```

### Start fresh (drop all data and re-crawl)
```bash
python run.py --reset
```

---

## 📊 What Gets Stored (per page)

| Field             | Example                                      |
|-------------------|----------------------------------------------|
| `url`             | https://admissions.psu.edu/info/future/...   |
| `domain`          | admissions.psu.edu                           |
| `section`         | Admissions                                   |
| `title`           | Apply to Penn State                          |
| `text_content`    | Full visible page text (up to 50k chars)     |
| `headings`        | ["Apply to Penn State", "Deadlines", ...]    |
| `emails`          | ["admissions@psu.edu"]                       |
| `phones`          | ["814-865-5471"]                             |
| `videos`          | [{type: "embed", url: "youtube.com/..."}]    |
| `pdfs`            | ["https://psu.edu/forms/apply.pdf"]          |
| `images`          | [{url: "...", alt: "Campus tour photo"}]     |
| `internal_links`  | All discovered PSU links (used for crawling) |
| `scraped_at`      | 2026-03-28T12:00:00Z                         |

---

## 🔍 Querying the Data (MongoDB)

```javascript
// Open MongoDB shell: mongosh

use degreeflow

// Search by section
db.psu_pages.find({ section: "Admissions" }).limit(5)

// Full-text search (powered by text index)
db.psu_pages.find({ $text: { $search: "financial aid deadlines" } })

// Find all pages with contact emails
db.psu_pages.find({ emails: { $exists: true, $ne: [] } })

// Find all pages with videos
db.psu_pages.find({ "videos.0": { $exists: true } })

// Count pages per section
db.psu_pages.aggregate([
  { $group: { _id: "$section", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## 🔧 Extending to Other Universities

To add a new university, edit `config.py`:

```python
SEED_URL = "https://www.mit.edu"
ALLOWED_DOMAINS = ["mit.edu", "admissions.mit.edu", "catalog.mit.edu"]
```

Then run: `python run.py --reset`

---

## 🤖 Next Step — AI Counselor Agent

Once MongoDB is populated, the next phase builds an AI agent on top:
- Student asks a natural language question
- Agent searches MongoDB (text index + semantic search)
- Returns answers with source page links

---

## ⚠️ Responsible Crawling

This scraper:
- ✅ Respects `robots.txt`
- ✅ Uses a 1.5s delay between requests
- ✅ Identifies itself with a User-Agent header
- ✅ Stays within PSU's own domains only
