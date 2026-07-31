# Anime character dataset candidate audit

Date: 2026-07-30

## The short answer

None of the ten dataset repositories checked is ready to become TattTester's production source for **the top 1,000 MyAnimeList shows, their verified MAIN characters, and character aliases**.

The biggest datasets sound impressive, but row count is not the problem we need to solve. We need three facts joined reliably:

1. a stable MyAnimeList anime ID from the current top-1,000 ranking;
2. a stable character ID plus an explicit `Main` role for that anime;
3. aliases that belong to that exact character.

Most candidates contain only character pages, images, wiki descriptions, or generic dialogue. The two candidates with the best relational shape are derived from MyAnimeList scraping. Their uploader-applied licenses do not erase MyAnimeList's upstream restrictions, and one is explicitly non-commercial.

**Recommendation:** keep the existing narrow acquisition chain as the production candidate: current MAL ranking for selection, a licensed ID map, and a source that explicitly returns the anime-character role. Use a dataset below only as an offline comparison sample after its upstream rights and schema are cleared. Do not ingest images or long bios into the product.

## Decision key

- **APPROVE** — suitable for the production identity layer now.
- **TEST** — worth a small, local, non-production coverage test; not approved to ship.
- **HOLD** — potentially useful, but a rights or provenance question must be resolved first.
- **REJECT** — wrong shape, wrong rights, or too unreliable for this need.

## Ranked result for TattTester's narrow need

| Rank | Candidate | Technical fit | Decision | Plain-English reason |
|---:|---|---:|---|---|
| 1 | Kaggle `neelagiriaditya/anime-dataset-jan-1917-to-oct-2025` | Very high | **HOLD** | The only candidate verified to have anime rank, MAL anime/character IDs, an explicit `role` whose values include `Main`, and a nickname table in one relational bundle. Its CC BY-NC-SA 4.0 license blocks a commercial TattTester use. |
| 2 | Kaggle `syahrulapriansyah2/anime-characters` **plus its separate parent anime dataset** | Medium-high | **TEST** | Stable MAL character IDs and names are useful, and the parent may preserve anime roles. The character file alone does not contain anime membership or `Main`; uploader MIT does not settle the rights to scraped MAL content. Test only a small sample while seeking upstream permission. |
| 3 | Kaggle `ophelion/mal-character-dataset` | Low-medium | **REJECT** | Good character names and MAL page links, but no documented anime-character role relationship. The 3.1 GB package includes image-oriented material we do not need, and the CC0 label conflicts with the fact that it republishes scraped MAL data and images. |
| 4 | Kaggle `sazzadsiddiquelikhon/anime-character-database-july-2025` | Low-medium | **REJECT** | A large character snapshot, but no documented anime membership, `Main` role, or alias table. Its own license says the contents remain with the original authors. |
| 5 | HF `mrzjy/AnimeMangaCharacters-247K` | Low | **HOLD** | Could help discover a Fandom page URL or series-site name, but has no stable MAL IDs, aliases, or explicit role. The dataset declares CC BY 4.0 while its source text is generally CC BY-SA 3.0 and per-wiki exceptions exist. |
| 6 | HF `mrzjy/AniPersonaCaps` | Low for identity; medium for visual enrichment | **HOLD** | Appearance text could be a later, source-linked RAG supplement. It cannot establish `Main`, aliases, or MAL identity, and the dataset's license does not preserve the usual Fandom share-alike license. |
| 7 | HF `mrzjy/AniGamePersonaCaps` | Low | **REJECT** | Mixed anime, manga, comics, and games; inconsistent published counts; generated captions are explicitly described as hallucination-prone. It is not an identity or role authority. |
| 8 | HF `adi2606/Anime_Characters` | Very low | **REJECT** | Only 1,941 images labeled by 322 anime titles. The character name lives in a filename, there is no role or alias field, and its README restricts use to educational/research/non-commercial despite the metadata tag saying MIT. |
| 9 | HF `theblackcat102/anime-understanding-dataset` | None | **REJECT** | A 1,771-row multiple-choice benchmark for 13 series, not a character catalog. |
| 10 | HF `scryptiam/anime-waifu-personality-chat` | None | **REJECT** | 1,722 generic archetype/dialogue rows. It contains no characters, shows, IDs, roles, or aliases. |

AniPersonaCaps and its newer superset AniGamePersonaCaps were checked separately because their fields, counts, and license labels differ.

## Candidate evidence

### 1. Kaggle — Anime Characters (`syahrulapriansyah2`)

- **Exists:** [Kaggle dataset](https://www.kaggle.com/datasets/syahrulapriansyah2/anime-characters); [public Kaggle metadata API](https://www.kaggle.com/api/v1/datasets/view/syahrulapriansyah2/anime-characters)
- **Updated:** 2025-11-07, version 1, according to Kaggle's metadata API.
- **Size/count:** card claims 139,497 unique characters from 19,931 anime titles; compressed package metadata is about 47.7 MB.
- **Fields:** `character_id`, `full_name`, `alternate_name`, `name`, `url`, JSON `attributes`, and `description`.
- **Lineage:** the card says character IDs were extracted from a separate [MyAnimeList Anime Dataset 2025](https://www.kaggle.com/datasets/syahrulapriansyah2/myanimelist-2025), then individual MAL character pages were scraped in November 2025. Kaggle metadata says the expected update frequency is `never`.
- **License shown by Kaggle:** MIT.
- **Fit:** the file has a stable MAL character ID and one alternate-name field, but no anime ID or anime-specific role. It only becomes technically interesting if joined back to the separate parent dataset and if that parent really preserves `role: Main`.
- **Commercial risk:** **high** until MyAnimeList authorizes this use. MyAnimeList's terms limit site use to personal/non-commercial use, prohibit aggregation for use elsewhere, and say scraping/extraction requires prior written consent. A downstream MIT label does not demonstrate that the uploader had authority to relicense MAL text.
- **Decision:** **TEST**, meaning a small non-production schema/coverage comparison only. Do not ship or train on its descriptions.

### 2. Kaggle — Anime Character Database (July 2025)

- **Exists:** [Kaggle dataset](https://www.kaggle.com/datasets/sazzadsiddiquelikhon/anime-character-database-july-2025); [public Kaggle metadata API](https://www.kaggle.com/api/v1/datasets/view/sazzadsiddiquelikhon/anime-character-database-july-2025)
- **Updated:** 2025-07-17, version 2.
- **Size/count:** card says over 200,000 MAL anime and manga characters; metadata API reports about 99.5 MB compressed.
- **Verified CSV fields:** `mal_id`, `url`, `name`, `name_kanji`, `nicknames`, `favorites`, `about`, `image_jpg_url`, `image_webp_url`, and `image_webp_small_url`.
- **Lineage:** the metadata says the contents come exclusively from MyAnimeList through Jikan API v4, with a monthly expected update. No collection code or reproducible source repository is linked on the card.
- **License shown by Kaggle:** ODbL-1.0 / “Database: Open Database, Contents: © Original Authors.”
- **Fit:** useful MAL IDs and nicknames, but no anime ID relationship or `Main` role. It would require a second dataset and a trustworthy stable-ID join.
- **Commercial risk:** **high**. The card expressly reserves content rights to original authors, and the source is MAL.
- **Decision:** **REJECT** for the production identity layer.

### 3. Kaggle — MyAnimeList Character Dataset (`ophelion`)

- **Exists:** [Kaggle dataset](https://www.kaggle.com/datasets/ophelion/mal-character-dataset); [public Kaggle metadata API](https://www.kaggle.com/api/v1/datasets/view/ophelion/mal-character-dataset); [Ficbot source project](https://github.com/Pythonimous/ficbot)
- **Updated:** 2025-02-26, version 5.
- **Size/count:** 106,299 characters; 102,579 unique English names; 78,822 unique Japanese/other-language names; 92,766 characters with images. Kaggle reports about 3.11 GB compressed.
- **Verified CSV fields:** `eng_name`, `kanji_name`, `bio`, `mal_link`, `img_link`, and `img_index`.
- **Lineage:** the card says Selenium plus the unofficial Jikan API/public `jikanpy` wrapper. Jikan itself states that it is an unofficial API that scrapes MyAnimeList.
- **License shown by Kaggle:** CC0.
- **Fit:** useful for one source-language name and character page links, but it lacks an anime-character join, `Main` role, and real alias list. The linked Ficbot project describes retrieval over MAL's top 1,000 **popular characters**, which is a different grain from the main casts of the top 1,000 **shows**.
- **Commercial risk:** **very high**. CC0 is the uploader's claim, not proof that MAL biographies and third-party images were public-domain works. Images are especially unnecessary and risky for our identity detector.
- **Decision:** **REJECT**.

### 4. Kaggle — Anime Dataset 2025 (`neelagiriaditya`)

- **Exists:** [Kaggle dataset](https://www.kaggle.com/datasets/neelagiriaditya/anime-dataset-jan-1917-to-oct-2025); [public Kaggle metadata API](https://www.kaggle.com/api/v1/datasets/view/neelagiriaditya/anime-dataset-jan-1917-to-oct-2025)
- **Updated:** 2025-11-05, version 1.
- **Size/count:** 4.79 GB compressed and 130,267,908 total rows, dominated by user ratings. Relevant tables: `details.csv` 28,955; `characters.csv` 208,727; `character_anime_works.csv` 236,816; `character_nicknames.csv` 36,923.
- **Verified relevant fields/shape:**
  - `details.csv`: `mal_id`, titles, `rank`, `popularity`, and other anime metadata;
  - `character_anime_works.csv`: `anime_mal_id`, `character_mal_id`, `character_name`, `role` — sampled values include `Main`;
  - `characters.csv`: `character_mal_id`, `url`, `name`, `name_kanji`, `image`, `favorites`, `about`;
  - `character_nicknames.csv`: `character_mal_id`, `nickname`.
- **Lineage:** card describes it as a comprehensive MyAnimeList archive; no reproducible collector repository is linked.
- **License shown by Kaggle:** CC BY-NC-SA 4.0.
- **Fit:** strongest table shape in this list. It can take its snapshot rank, select 1,000 anime, join `role=Main`, then join names and nicknames without fuzzy matching. It is still a November 2025 snapshot rather than today's customer-supplied MAL ranking.
- **Commercial risk:** **disqualifying as published**. “NC” means non-commercial, and TattTester is a commercial product. The MAL source adds a second permission issue.
- **Decision:** **HOLD**. Do not download the 4.79 GB bundle or ship it. A tiny schema sample would only make sense if the author or MAL first offers a commercially usable grant.

### 5. Hugging Face — AniPersonaCaps

- **Exists:** [dataset card](https://huggingface.co/datasets/mrzjy/AniPersonaCaps); [source repository](https://github.com/mrzjy/AniPersonaCaps); [HF metadata API](https://huggingface.co/api/datasets/mrzjy/AniPersonaCaps)
- **Updated:** 2024-12-18.
- **Size/count:** card claims 45,000+ unique characters from 1,000+ anime titles. The repository contains roughly 50,000 image objects plus `metadata.jsonl`; the public dataset viewer currently times out, so the exact row count was not independently confirmed.
- **Fields:** image filename, title, character, appearance, personality, and source URL.
- **Lineage:** character pages and the first infobox image from Fandom wikis. The card admits missing nested categories, missing characters without an Appearance section, image-text mismatch, and incorrectly parsed text.
- **License shown by HF:** CC BY 4.0; the linked GitHub repository displays CC0-1.0, which is another inconsistency.
- **Fit:** rich appearance prose, but no stable MAL ID, anime-specific role, or alias collection.
- **Commercial risk:** **high without per-record remediation**. Fandom says wiki text is generally CC BY-SA 3.0, some wikis use different/non-commercial licenses, attribution is required, and non-text media must not be assumed to share the text license. The dataset's blanket CC BY/CC0 labels do not preserve that provenance.
- **Decision:** **HOLD** for a future text-only, source-URL-preserving RAG experiment; **not** for core identity.

### 6. Hugging Face — AniGamePersonaCaps

- **Exists:** [dataset card](https://huggingface.co/datasets/mrzjy/AniGamePersonaCaps); [HF metadata API](https://huggingface.co/api/datasets/mrzjy/AniGamePersonaCaps); [HF dataset-server size endpoint](https://datasets-server.huggingface.co/size?dataset=mrzjy%2FAniGamePersonaCaps&config=default)
- **Updated:** 2024-12-16.
- **Size/count:** card claims 633,565 characters from 3,860 Fandom sites. HF's current server statistics report 21,033 processed rows and an estimated 541,295 rows, so the published count is not presently reproducible through the viewer.
- **Fields:** image, character-page title, site name, URL, truncated description, image URL, and a serialized caption containing human, anonymized, and Qwen-generated appearance/personality variants.
- **Lineage:** more than one million Fandom character pages across anime, manga, comics, and games; filtered and captioned with Qwen vision-language models.
- **License shown by HF:** CC BY-SA 4.0.
- **Fit:** no MAL IDs, no role, no reliable aliases, and substantial cross-domain noise.
- **Quality risk:** the card explicitly says generated captions are imperfect and hallucination-prone. It reports human appearance text for only 18% and human personality text for 19% of samples.
- **Commercial risk:** same per-wiki text and per-image issues as AniPersonaCaps.
- **Decision:** **REJECT** for this task.

### 7. Hugging Face — AnimeMangaCharacters-247K

- **Exists:** [dataset card](https://huggingface.co/datasets/mrzjy/AnimeMangaCharacters-247K); [HF metadata API](https://huggingface.co/api/datasets/mrzjy/AnimeMangaCharacters-247K); [HF size/schema endpoint](https://datasets-server.huggingface.co/size?dataset=mrzjy%2FAnimeMangaCharacters-247K&config=default)
- **Updated:** 2024-12-13.
- **Exact count:** 247,034 rows from 2,372 Fandom wiki sites.
- **Fields:** `title`, `site_name`, `url`, truncated `description`, and `image`.
- **Lineage:** anime/manga wiki list from Animanga Fandom, then Open Graph metadata parsed from each Fandom page; deduplicated by URL.
- **License shown by HF:** CC BY 4.0.
- **Fit:** a useful candidate-URL index, but no MAL IDs, aliases, or explicit `Main` role. A page title is not always a character (the viewer includes list pages such as “Characters”).
- **Commercial risk:** blanket CC BY 4.0 does not match Fandom's usual CC BY-SA 3.0 text license or handle per-wiki exceptions and non-text image rights.
- **Decision:** **HOLD** only as a possible discovery index after a provenance/license transform; not production knowledge.

### 8. Hugging Face — Anime_Characters (`adi2606`)

- **Exists:** [dataset card](https://huggingface.co/datasets/adi2606/Anime_Characters); [HF metadata API](https://huggingface.co/api/datasets/adi2606/Anime_Characters); [HF size/schema endpoint](https://datasets-server.huggingface.co/size?dataset=adi2606%2FAnime_Characters&config=default)
- **Updated:** 2025-04-29.
- **Exact count:** 1,941 images across 322 anime-title folders.
- **Fields:** image and anime-title class label. The character name is only implied by the image filename in the repository.
- **Lineage:** not documented beyond the uploaded folder structure.
- **License shown by HF:** MIT, but the README separately says the dataset may contain copyrighted content and is strictly educational, research, or non-commercial.
- **Fit:** cannot answer which characters are `Main`, does not provide aliases, and covers too few series.
- **Commercial risk:** **high**, with an explicit non-commercial warning from the uploader.
- **Decision:** **REJECT**.

### 9. Hugging Face — anime-waifu-personality-chat

- **Exists:** [dataset card](https://huggingface.co/datasets/scryptiam/anime-waifu-personality-chat); [HF metadata API](https://huggingface.co/api/datasets/scryptiam/anime-waifu-personality-chat); [HF size/schema endpoint](https://datasets-server.huggingface.co/size?dataset=scryptiam%2Fanime-waifu-personality-chat&config=default)
- **Updated:** 2026-03-12.
- **Exact count/fields:** 1,722 rows with only `trait` and `dialogue`.
- **Lineage:** the card gives no source lineage for the dialogue.
- **License shown by HF:** CC BY 4.0.
- **Fit:** zero. These are generic archetype prompts such as tsundere/deredere, not named character facts.
- **Commercial risk:** unclear provenance, but irrelevant before rights even matter.
- **Decision:** **REJECT**.

### 10. Hugging Face — anime-understanding-dataset

- **Exists:** [dataset card](https://huggingface.co/datasets/theblackcat102/anime-understanding-dataset); [HF metadata API](https://huggingface.co/api/datasets/theblackcat102/anime-understanding-dataset); [HF size endpoint](https://datasets-server.huggingface.co/size?dataset=theblackcat102%2Fanime-understanding-dataset)
- **Updated:** 2024-02-19.
- **Exact count/coverage:** 1,771 multiple-choice rows across 13 named series configurations.
- **Fields:** question, answers A-D, correct answer, and anime slug.
- **Lineage:** the README lists Fandom wikis and Wikipedia. It says human inspection for errors is still planned.
- **License shown by HF:** MIT.
- **Fit:** an evaluation benchmark, not a catalog. It has no stable character table, roles, or aliases.
- **Commercial risk:** the MIT label does not show that the uploader can relicense copied wiki questions/facts, but it is irrelevant to our identity layer either way.
- **Decision:** **REJECT**.

## Rights boundary that changes the answer

Dataset-platform labels are not enough. The uploader can license their own database arrangement and original work, but cannot automatically put someone else's biographies, images, or database content under MIT or CC0.

- [MyAnimeList Terms of Use](https://myanimelist.net/about/terms_of_use) grant a limited personal, non-commercial license, prohibit aggregation for use elsewhere, and state that scraping/extraction is not expressly allowed without prior written consent.
- [MyAnimeList API License and Developer Agreement](https://myanimelist.net/static/apiagreement.html) requires express authorization for commercial applications, prohibits API-derived scraping, and says applications may only obtain MAL content through the authorized API.
- [Jikan's own documentation](https://docs.api.jikan.moe/) says it is an unofficial API that scrapes MyAnimeList.
- [Fandom's licensing policy](https://www.fandom.com/licensing) says text is generally CC BY-SA 3.0 but some wikis have other licenses; attribution and share-alike apply.
- [Fandom's reuse guidance](https://support.fandom.com/hc/en-us/articles/360035075654-I-want-to-reuse-text-or-images-from-a-Fandom-wiki) says non-text media is separate and that most images are uploaded under fair use, so image rights cannot be assumed.

This is a product-engineering risk assessment, not legal advice. The practical safe rule is simple: do not put a scraped MAL/Fandom dataset into a paid production product merely because its Kaggle or Hugging Face card says MIT, CC0, or CC BY.

## What is worth doing next

1. **Do not replace the current acquisition pipeline with any candidate here.**
2. If we want a comparison, take a **100-show, text-only sample** from the Syahrul companion pair without committing it, and measure:
   - MAL anime-ID join rate;
   - percentage of relationships with an explicit `Main` role;
   - alias coverage per resolved character;
   - collisions such as “L”, “King”, or characters reused across sequels.
3. Before any production use, ask the dataset owner and MyAnimeList for a commercial grant covering the exact fields we want.
4. Keep generated output minimal: stable IDs, canonical/display names, aliases, anime ID, role, and source/provenance. Exclude bios and images.
5. Continue using the curated hand-written visual descriptions as a premium overlay. Identity data and visual prompt knowledge should remain separate.

## Audit method and limitations

I read the live Kaggle dataset cards and public metadata API, Hugging Face dataset cards/API/dataset-server schemas, linked owner repository where present, and the upstream MAL, Jikan, and Fandom terms. I did **not** download the multi-gigabyte datasets or image archives. Where a public card did not expose a column dictionary, this memo says so instead of guessing.
