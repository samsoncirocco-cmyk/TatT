from execution.ig_quality import looks_bookable


def test_accepts_individual_artist_with_booking_signal():
    assert looks_bookable(
        {
            "fullName": "Sam Rivera",
            "biography": "Blackwork tattoo artist. Books open — DM to book.",
        }
    ) == (True, "artist+booking")


def test_rejects_shop_supplier_and_private_accounts_with_reasons():
    assert looks_bookable(
        {"biography": "Tattoo supply needles and pigment. Shop now."}
    ) == (False, "supply/brand")
    assert looks_bookable(
        {"biography": "Tattoo studio in Phoenix. Meet our artists."}
    ) == (False, "shop-account")
    assert looks_bookable(
        {"biography": "Tattoo artist", "private": True}
    ) == (False, "private")


def test_supports_both_discovery_and_apify_field_names():
    assert looks_bookable(
        {
            "name": "Ari",
            "bio": "Fine line tattooer",
            "externalUrl": "https://booking.example",
            "followers": 12,
        }
    ) == (True, "artist+booking")
