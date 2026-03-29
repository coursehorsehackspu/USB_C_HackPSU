#!/usr/bin/env python3
from database.course_loader import CourseLoader
from datetime import datetime, timezone

loader = CourseLoader()
loader.connect()
now = datetime.now(timezone.utc).isoformat()

programs = [
    {
        "program_name": "Computer Science, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/engineering/computer-science-bs/",
        "college": "College of Engineering",
        "level": "Undergraduate",
        "total_credits": 127,
        "required_courses": [
            "CMPSC 150", "CMPSC 221", "CMPSC 222", "CMPSC 315", "CMPSC 316",
            "CMPSC 320", "CMPSC 360", "CMPSC 461", "CMPSC 465", "CMPSC 483",
            "ENGL 202", "PHYS 211", "PHYS 212",
            "CMPSC 121", "CMPSC 132",
            "CMPEN 270", "ENGL 15",
            "MATH 140", "MATH 141", "MATH 220", "MATH 230",
            "STAT 318", "STAT 319",
        ],
        "optional_courses": ["CMPEN 431","CMPSC 431","CMPSC 432","CMPSC 442","CMPSC 443","CMPSC 448","CMPSC 464","CMPSC 471","CMPSC 473"],
        "scraped_at": now,
    },
    {
        "program_name": "Mathematics, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/science/mathematical-sciences-bs/",
        "college": "Eberly College of Science",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "ENGL 202", "MATH 140", "MATH 141", "MATH 311",
            "MATH 401", "MATH 430",
            "MATH 220", "MATH 230", "MATH 251", "MATH 425",
            "MATH 435", "MATH 475",
            "CMPSC 121", "STAT 318", "STAT 401",
        ],
        "optional_courses": ["MATH 455","STAT 414","STAT 415","STAT 462"],
        "scraped_at": now,
    },
    {
        "program_name": "Computer Engineering, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/engineering/computer-engineering-bs/",
        "college": "College of Engineering",
        "level": "Undergraduate",
        "total_credits": 128,
        "required_courses": [
            "CMPSC 121", "CMPEN 270", "CMPEN 371", "CMPEN 411", "CMPEN 431", "CMPEN 451",
            "EE 210", "EE 211", "EE 330", "EE 380",
            "MATH 140", "MATH 141", "MATH 220", "MATH 230",
            "PHYS 211", "PHYS 212", "PHYS 213",
            "ENGL 15", "ENGL 202", "STAT 318",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Electrical Engineering, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/engineering/electrical-engineering-bs/",
        "college": "College of Engineering",
        "level": "Undergraduate",
        "total_credits": 128,
        "required_courses": [
            "EE 210", "EE 211", "EE 310", "EE 330", "EE 340",
            "EE 350", "EE 380", "EE 453",
            "MATH 140", "MATH 141", "MATH 220", "MATH 230",
            "PHYS 211", "PHYS 212", "PHYS 213",
            "ENGL 15", "ENGL 202", "STAT 318", "CMPSC 121",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Statistics, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/science/statistics-bs/",
        "college": "Eberly College of Science",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "STAT 200", "STAT 318", "STAT 319", "STAT 401", "STAT 415", "STAT 416",
            "MATH 140", "MATH 141", "MATH 220",
            "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Data Sciences, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/science/data-sciences-bs/",
        "college": "Eberly College of Science",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "CMPSC 121", "CMPSC 132",
            "MATH 140", "MATH 141",
            "STAT 318", "STAT 319", "STAT 415", "STAT 416",
            "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Information Sciences and Technology, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/information-sciences-technology/information-sciences-technology-bs/",
        "college": "College of Information Sciences and Technology",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "IST 110", "IST 210", "IST 220", "IST 230", "IST 240",
            "IST 256", "IST 301", "IST 302", "IST 311", "IST 312",
            "IST 331", "IST 402", "IST 411", "IST 420", "IST 421",
            "IST 431", "IST 440",
            "ENGL 15", "ENGL 202", "STAT 200",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Accounting, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/smeal-business/accounting-bs/",
        "college": "Smeal College of Business",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "ACCTG 211", "ACCTG 212", "ACCTG 301", "ACCTG 302",
            "ACCTG 311", "ACCTG 313", "ACCTG 403", "ACCTG 404",
            "FIN 301", "STAT 200", "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Finance, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/smeal-business/finance-bs/",
        "college": "Smeal College of Business",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "FIN 301", "FIN 305", "FIN 406", "FIN 407", "FIN 408", "FIN 410",
            "ACCTG 211", "ACCTG 212",
            "STAT 200", "ECON 302", "ECON 304",
            "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Economics, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/liberal-arts/economics-bs/",
        "college": "College of the Liberal Arts",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "ECON 102", "ECON 104", "ECON 301", "ECON 302",
            "ECON 304", "ECON 401", "ECON 402",
            "MATH 110", "STAT 200", "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Psychology, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/liberal-arts/psychology-bs/",
        "college": "College of the Liberal Arts",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "PSYCH 100", "PSYCH 200", "PSYCH 212", "PSYCH 213",
            "PSYCH 301", "PSYCH 303", "PSYCH 400",
            "STAT 200", "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Biology, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/science/biology-bs/",
        "college": "Eberly College of Science",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "BIOL 110", "BIOL 220", "BIOL 230", "BIOL 240",
            "CHEM 110", "CHEM 111", "CHEM 112", "CHEM 113",
            "MATH 110", "STAT 200", "ENGL 15", "ENGL 202",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Nursing, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/nursing/nursing-bs/",
        "college": "Ross and Carol Nese College of Nursing",
        "level": "Undergraduate",
        "total_credits": 120,
        "required_courses": [
            "NURS 100", "NURS 200", "NURS 201", "NURS 202", "NURS 301",
            "NURS 302", "NURS 400", "NURS 401", "NURS 402",
            "BIOL 141", "BIOL 142", "CHEM 101", "PSYCH 100",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
    {
        "program_name": "Mechanical Engineering, B.S.",
        "url": "https://bulletins.psu.edu/undergraduate/colleges/engineering/mechanical-engineering-bs/",
        "college": "College of Engineering",
        "level": "Undergraduate",
        "total_credits": 128,
        "required_courses": [
            "ME 201", "ME 202", "ME 203", "ME 300", "ME 304",
            "ME 340", "ME 360", "ME 402", "ME 404",
            "MATH 140", "MATH 141", "MATH 220", "MATH 230",
            "PHYS 211", "PHYS 212",
            "CHEM 110", "ENGL 15", "ENGL 202", "STAT 318",
        ],
        "optional_courses": [],
        "scraped_at": now,
    },
]

for prog in programs:
    loader.programs.delete_many({"program_name": prog["program_name"]})
    loader.programs.insert_one(prog)
    print(f"✅ {prog['program_name']} — {len(prog['required_courses'])} courses")

print(f"\n✅ Done! {len(programs)} programs loaded")
loader.close()