#!/usr/bin/env python3
"""
Generate 100 fake Arizona tattoo artists with Replicate placeholder images
Based on actual Arizona tattoo shops
"""

import json
import random

# Artist first names
FIRST_NAMES = [
    "Sarah", "Marcus", "Jessica", "David", "Emily", "Carlos", "Ashley", "Miguel",
    "Rachel", "James", "Amanda", "Luis", "Nicole", "Brandon", "Jennifer", "Jose",
    "Melissa", "Daniel", "Christina", "Anthony", "Lauren", "Roberto", "Kimberly",
    "Ryan", "Sophia", "Xavier", "Victoria", "Isaiah", "Natalie", "Diego",
    "Samantha", "Gabriel", "Madison", "Felix", "Olivia", "Mario", "Hannah",
    "Tyler", "Alexis", "Hector", "Brittany", "Angel", "Jasmine", "Jordan",
    "Kayla", "Adrian", "Morgan", "Javier", "Taylor", "Marco"
]

# Artist last names
LAST_NAMES = [
    "Rodriguez", "Chen", "Martinez", "Johnson", "Garcia", "Smith", "Lopez",
    "Williams", "Brown", "Jones", "Miller", "Davis", "Wilson", "Anderson",
    "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson",
    "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson",
    "Walker", "Young", "Allen", "King", "Wright", "Scott", "Torres", "Nguyen",
    "Hill", "Flores", "Green", "Adams", "Nelson", "Baker", "Hall", "Rivera",
    "Campbell", "Mitchell", "Carter", "Roberts", "Gomez", "Phillips"
]

# Arizona tattoo shops from your list
ARIZONA_SHOPS = [
    {"name": "Golden Rule Tattoo (Roosevelt)", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Golden Rule Tattoo (Camelback)", "city": "Phoenix", "lat": 33.5095, "lng": -111.9810},
    {"name": "Copper State Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "27 Tattoo Studio", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Grand Avenue Tattoo", "city": "Phoenix", "lat": 33.4742, "lng": -112.1040},
    {"name": "High Noon Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "1912 Tattoo Studio", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "GreyWash Ink Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Solace Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Goliath Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Sentient Tattoo Collective", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Living Canvas Tattoos", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Club Tattoo (ASU)", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "No Regrets Tattoo Parlor", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Lady Luck Tattoo Gallery", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Club Tattoo (Scottsdale)", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Dame of the West Tattoo", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Old Town Ink", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Immaculate Tattoo", "city": "Mesa", "lat": 33.4152, "lng": -111.8315},
    {"name": "Urban Art Tattoo", "city": "Mesa", "lat": 33.4152, "lng": -111.8315},
    {"name": "Black Lotus Tattooers", "city": "Gilbert", "lat": 33.3528, "lng": -111.7890},
    {"name": "Fifth Estate", "city": "Gilbert", "lat": 33.3528, "lng": -111.7890},
    {"name": "Old West Tattoo", "city": "Glendale", "lat": 33.5387, "lng": -112.1860},
    {"name": "Fifth Finger Studio", "city": "Glendale", "lat": 33.5387, "lng": -112.1860},
    {"name": "Revival Art Collective", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Ink Therapy Tattoo", "city": "Peoria", "lat": 33.5806, "lng": -112.2374},
    {"name": "Three Tides Tattoo", "city": "Apache Junction", "lat": 33.4151, "lng": -111.5496},
    {"name": "Lucid Art", "city": "Cave Creek", "lat": 33.8428, "lng": -111.9510},
    {"name": "She Devil Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Gypsy Rose Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Lady Luck Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Karma Tattoo Studio", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Arizona Classic Tattoo Company", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Last Laugh Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Happy Daze AZ", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Tattoo Paulski", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "TattooU", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Yours Truly", "city": "Mesa", "lat": 33.4152, "lng": -111.8315},
    {"name": "Dreamscapes Fine Art", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Sun Gold Tattoo and Barber", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Istari Studios", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Haunted Hands", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Trinity Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Liberty House Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Black Rose Tattooers", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Sanctity Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Tucson Tattoo Company", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Fast Lane Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "The Painted Lady", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Spark Project Collective", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Flagstaff Tattoo Company", "city": "Flagstaff", "lat": 35.1983, "lng": -111.6513},
    {"name": "Burly Fish Tattoo", "city": "Flagstaff", "lat": 35.1983, "lng": -111.6513},
    {"name": "Woody's World Famous Tattoo", "city": "Flagstaff", "lat": 35.1983, "lng": -111.6513},
    {"name": "Mirror Gallery", "city": "Flagstaff", "lat": 35.1983, "lng": -111.6513},
    {"name": "Sacred Art Tattoo", "city": "Prescott", "lat": 34.5400, "lng": -112.4685},
    {"name": "Black Cat Tattoo", "city": "Prescott", "lat": 34.5400, "lng": -112.4685},
    {"name": "Dovetail Tattoo", "city": "Prescott", "lat": 34.5400, "lng": -112.4685},
    {"name": "Iron Horse Tattoo", "city": "Bullhead City", "lat": 35.1360, "lng": -114.5683},
    {"name": "Darkside Tattoo", "city": "Lake Havasu City", "lat": 34.4839, "lng": -114.3224},
    {"name": "Ink and Iron", "city": "Yuma", "lat": 32.6927, "lng": -114.6277},
    {"name": "Blind Tiger Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Love & Hate Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Stay True Tattoo", "city": "Sedona", "lat": 34.8697, "lng": -111.7610},
    {"name": "Divinity Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Artistic Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Blue Arms Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Heart and Soul Tattoo", "city": "Glendale", "lat": 33.5387, "lng": -112.1860},
    {"name": "Painted Bird Tattoo", "city": "Chandler", "lat": 33.3062, "lng": -111.8413},
    {"name": "Sage & Serpent", "city": "Gilbert", "lat": 33.3528, "lng": -111.7890},
    {"name": "Salt & Light Tattoo", "city": "Chandler", "lat": 33.3062, "lng": -111.8413},
    {"name": "Tattoo Gallery", "city": "Prescott", "lat": 34.5400, "lng": -112.4685},
    {"name": "Ink Therapy", "city": "Surprise", "lat": 33.6303, "lng": -112.3679},
    {"name": "Arizona Ink", "city": "Yuma", "lat": 32.6927, "lng": -114.6277},
    {"name": "Electric Tiger Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Copper State Tattoo (2nd Location)", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Living Canvas (Mill Ave)", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Anchor Tattoo", "city": "Chandler", "lat": 33.3062, "lng": -111.8413},
    {"name": "Black Sage Tattoo", "city": "Sedona", "lat": 34.8697, "lng": -111.7610},
    {"name": "Cactus Tattoo", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Desert Rose Tattoo", "city": "Kingman", "lat": 35.1894, "lng": -114.0530},
    {"name": "Emerald City Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Fire & Ice Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Gold Dust Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Hidden Rose Tattoo", "city": "Flagstaff", "lat": 35.1983, "lng": -111.6513},
    {"name": "Iron Monk Tattoo", "city": "Glendale", "lat": 33.5387, "lng": -112.1860},
    {"name": "Jaded Tattoo", "city": "Mesa", "lat": 33.4152, "lng": -111.8315},
    {"name": "Kingman Tattoo", "city": "Kingman", "lat": 35.1894, "lng": -114.0530},
    {"name": "Lost Dutch Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Midnight Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Northside Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Oracle Tattoo", "city": "Tucson", "lat": 32.2217, "lng": -110.9265},
    {"name": "Prickly Pear Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Queen City Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Red Letter Tattoo", "city": "Tempe", "lat": 33.4255, "lng": -111.9400},
    {"name": "Silver Key Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Thin Line Tattoo", "city": "Sierra Vista", "lat": 31.5455, "lng": -110.2773},
    {"name": "Under the Gun Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740},
    {"name": "Velvet Iron Tattoo", "city": "Scottsdale", "lat": 33.4942, "lng": -111.9261},
    {"name": "Wild Card Tattoo", "city": "Mesa", "lat": 33.4152, "lng": -111.8315},
    {"name": "Zenith Tattoo", "city": "Phoenix", "lat": 33.4484, "lng": -112.0740}
]

# Tattoo styles
STYLES = [
    "Traditional", "Realism", "Watercolor", "Minimalist", "Japanese",
    "Tribal", "Geometric", "Blackwork", "Neo-Traditional", "Fine Line",
    "Color", "Portrait", "Lettering", "Dotwork", "Illustrative"
]

# Tags/keywords for matching
TAGS_BY_STYLE = {
    "Traditional": ["rose", "anchor", "skull", "sailor", "eagle", "dagger", "bold"],
    "Realism": ["portrait", "photorealistic", "detailed", "black and gray", "nature"],
    "Watercolor": ["colorful", "abstract", "splash", "artistic", "vibrant"],
    "Minimalist": ["simple", "line art", "small", "delicate", "clean"],
    "Japanese": ["dragon", "koi", "samurai", "cherry blossom", "wave", "tiger"],
    "Tribal": ["polynesian", "maori", "bold lines", "cultural", "geometric"],
    "Geometric": ["sacred geometry", "mandala", "symmetrical", "precise"],
    "Blackwork": ["solid black", "bold", "ornamental", "dotwork"],
    "Neo-Traditional": ["bold", "modern", "illustrative", "colorful"],
    "Fine Line": ["delicate", "intricate", "small", "detail"],
    "Color": ["vibrant", "colorful", "bright", "full color"],
    "Portrait": ["face", "realistic", "memorial", "celebrity"],
    "Lettering": ["script", "typography", "calligraphy", "words"],
    "Dotwork": ["stippling", "shading", "intricate", "mandala"],
    "Illustrative": ["artistic", "creative", "unique", "custom"]
}

def generate_artist(artist_id, shop_data):
    """Generate a single artist profile"""
    # Random name
    first_name = random.choice(FIRST_NAMES)
    last_name = random.choice(LAST_NAMES)
    name = f"{first_name} {last_name}"

    # Random styles (1-3 specialties)
    num_styles = random.choice([1, 2, 3])
    artist_styles = random.sample(STYLES, num_styles)

    # Tags based on styles
    tags = []
    for style in artist_styles:
        if style in TAGS_BY_STYLE:
            tags.extend(random.sample(TAGS_BY_STYLE[style], min(3, len(TAGS_BY_STYLE[style]))))
    tags = list(set(tags))[:8]  # Unique tags, max 8

    # Portfolio images (using Replicate placeholders)
    portfolio_images = [
        f"https://replicate.delivery/pbxt/placeholder-portfolio-{artist_id}-1.png",
        f"https://replicate.delivery/pbxt/placeholder-portfolio-{artist_id}-2.png",
        f"https://replicate.delivery/pbxt/placeholder-portfolio-{artist_id}-3.png"
    ]

    # Pricing (hourly rate between $100-$250)
    hourly_rate = random.choice([100, 125, 150, 175, 200, 225, 250])

    # Rating (4.0-5.0)
    rating = round(random.uniform(4.0, 5.0), 1)

    # Review count (10-500)
    review_count = random.randint(10, 500)

    # Years experience (1-20)
    years_experience = random.randint(1, 20)

    # Bio
    specialty_text = " & ".join(artist_styles)
    bio = f"Specializing in {specialty_text} tattoos. {years_experience}+ years creating custom designs in the heart of {shop_data['city']}, AZ. Book your consultation today!"

    # Instagram handle
    instagram = f"@{first_name.lower()}_{last_name.lower()}_ink"

    return {
        "id": artist_id,
        "name": name,
        "shopName": shop_data["name"],
        "city": shop_data["city"],
        "state": "AZ",
        "location": f"{shop_data['city']}, AZ",
        "coordinates": {
            "lat": shop_data["lat"],
            "lng": shop_data["lng"]
        },
        "styles": artist_styles,
        "tags": tags,
        "portfolioImages": portfolio_images,
        "instagram": instagram,
        "hourlyRate": hourly_rate,
        "rating": rating,
        "reviewCount": review_count,
        "bio": bio,
        "yearsExperience": years_experience,
        "bookingAvailable": random.choice([True, True, True, False])  # 75% available
    }

def main():
    """Generate 100 Arizona tattoo artists"""
    artists = []

    for i, shop in enumerate(ARIZONA_SHOPS, start=1):
        artist = generate_artist(i, shop)
        artists.append(artist)

    # Create the full JSON structure
    output = {
        "cities": [
            "All Locations",
            "Phoenix, AZ",
            "Scottsdale, AZ",
            "Tempe, AZ",
            "Mesa, AZ",
            "Gilbert, AZ",
            "Glendale, AZ",
            "Chandler, AZ",
            "Tucson, AZ",
            "Flagstaff, AZ",
            "Prescott, AZ",
            "Sedona, AZ",
            "Yuma, AZ",
            "Peoria, AZ",
            "Surprise, AZ",
            "Apache Junction, AZ",
            "Cave Creek, AZ",
            "Bullhead City, AZ",
            "Lake Havasu City, AZ",
            "Kingman, AZ",
            "Sierra Vista, AZ"
        ],
        "styles": [
            "All Styles",
            "Traditional",
            "Realism",
            "Watercolor",
            "Minimalist",
            "Japanese",
            "Tribal",
            "Geometric",
            "Blackwork",
            "Neo-Traditional",
            "Fine Line",
            "Color",
            "Portrait",
            "Lettering",
            "Dotwork",
            "Illustrative"
        ],
        "artists": artists
    }

    # Write to file
    with open('src/data/artists.json', 'w') as f:
        json.dump(output, f, indent=2)

    print(f"✅ Generated {len(artists)} Arizona tattoo artists!")
    print(f"📍 Cities: {len(output['cities']) - 1}")  # -1 for "All Locations"
    print(f"🎨 Styles: {len(output['styles']) - 1}")  # -1 for "All Styles"

if __name__ == "__main__":
    main()
