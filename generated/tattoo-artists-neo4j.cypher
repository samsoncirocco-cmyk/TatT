// Neo4j Import Script for Tattoo Artists
// Generated from Supabase-compatible dataset

// Clear existing data (optional - remove if you want to merge)
MATCH (n) DETACH DELETE n;

// Create indexes
CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);
CREATE INDEX artist_name_index IF NOT EXISTS FOR (a:Artist) ON (a.name);
CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);
CREATE INDEX color_name_index IF NOT EXISTS FOR (c:Color) ON (c.name);
CREATE INDEX specialization_name_index IF NOT EXISTS FOR (sp:Specialization) ON (sp.name);
CREATE INDEX location_city_index IF NOT EXISTS FOR (l:Location) ON (l.city);

// Create Style nodes
MERGE (s:Style {name: 'Photo Realism'});
MERGE (s:Style {name: 'Realism'});
MERGE (s:Style {name: 'Fine Line'});
MERGE (s:Style {name: 'Dotwork'});
MERGE (s:Style {name: 'New School'});
MERGE (s:Style {name: 'Geometric'});
MERGE (s:Style {name: 'Watercolor'});
MERGE (s:Style {name: 'Illustrative'});
MERGE (s:Style {name: 'Tribal'});
MERGE (s:Style {name: 'Minimalist'});
MERGE (s:Style {name: 'Lettering'});
MERGE (s:Style {name: 'Traditional'});
MERGE (s:Style {name: 'Neo-Traditional'});
MERGE (s:Style {name: 'Blackwork'});
MERGE (s:Style {name: 'Japanese'});
MERGE (s:Style {name: 'Portrait'});
MERGE (s:Style {name: 'Biomechanical'});
MERGE (s:Style {name: 'Abstract'});
MERGE (s:Style {name: 'Surrealism'});
MERGE (s:Style {name: 'Old School'});

// Create Color nodes
MERGE (c:Color {name: 'Earth Tones'});
MERGE (c:Color {name: 'Black & Grey'});
MERGE (c:Color {name: 'Full Color'});
MERGE (c:Color {name: 'Pastel'});
MERGE (c:Color {name: 'Bold Colors'});
MERGE (c:Color {name: 'Neon'});
MERGE (c:Color {name: 'Monochrome'});
MERGE (c:Color {name: 'Black Only'});
MERGE (c:Color {name: 'Muted'});
MERGE (c:Color {name: 'Vibrant'});

// Create Specialization nodes
MERGE (sp:Specialization {name: 'Horror'});
MERGE (sp:Specialization {name: 'Medical Cover-up'});
MERGE (sp:Specialization {name: 'Portraits'});
MERGE (sp:Specialization {name: 'Floral'});
MERGE (sp:Specialization {name: 'Cover-ups'});
MERGE (sp:Specialization {name: 'Lettering'});
MERGE (sp:Specialization {name: 'Mandala'});
MERGE (sp:Specialization {name: 'Nature'});
MERGE (sp:Specialization {name: 'Biomechanical'});
MERGE (sp:Specialization {name: 'Large Scale'});
MERGE (sp:Specialization {name: 'Cultural'});
MERGE (sp:Specialization {name: 'Watercolor'});
MERGE (sp:Specialization {name: 'Abstract'});
MERGE (sp:Specialization {name: 'Minimalist'});
MERGE (sp:Specialization {name: 'Religious'});
MERGE (sp:Specialization {name: 'Animal'});
MERGE (sp:Specialization {name: 'Small Delicate'});
MERGE (sp:Specialization {name: 'Geometric'});
MERGE (sp:Specialization {name: 'Fantasy'});
MERGE (sp:Specialization {name: 'Memorial'});

// Create Location nodes
MERGE (l:Location {city: 'Perth', region: 'Western Australia', country: 'Australia'});
MERGE (l:Location {city: 'San Diego', region: 'California', country: 'United States'});
MERGE (l:Location {city: 'Tucson', region: 'Arizona', country: 'United States'});
MERGE (l:Location {city: 'Brooklyn', region: 'New York', country: 'United States'});
MERGE (l:Location {city: 'Ewing Township', region: 'New Jersey', country: 'United States'});
MERGE (l:Location {city: 'Denver', region: 'Colorado', country: 'United States'});
MERGE (l:Location {city: 'San Francisco', region: 'California', country: 'United States'});
MERGE (l:Location {city: 'Melbourne', region: 'Victoria', country: 'Australia'});
MERGE (l:Location {city: 'Austin', region: 'Texas', country: 'United States'});
MERGE (l:Location {city: 'Vancouver', region: 'British Columbia', country: 'Canada'});
MERGE (l:Location {city: 'Houston', region: 'Texas', country: 'United States'});
MERGE (l:Location {city: 'Tampa', region: 'Florida', country: 'United States'});
MERGE (l:Location {city: 'Newark', region: 'New Jersey', country: 'United States'});
MERGE (l:Location {city: 'Montreal', region: 'Quebec', country: 'Canada'});
MERGE (l:Location {city: 'Jersey City', region: 'New Jersey', country: 'United States'});
MERGE (l:Location {city: 'Portland', region: 'Oregon', country: 'United States'});
MERGE (l:Location {city: 'Manhattan', region: 'New York', country: 'United States'});
MERGE (l:Location {city: 'Sydney', region: 'New South Wales', country: 'Australia'});
MERGE (l:Location {city: 'Burlington', region: 'Vermont', country: 'United States'});
MERGE (l:Location {city: 'Dallas', region: 'Texas', country: 'United States'});
MERGE (l:Location {city: 'Phoenix', region: 'Arizona', country: 'United States'});
MERGE (l:Location {city: 'Los Angeles', region: 'California', country: 'United States'});
MERGE (l:Location {city: 'Miami', region: 'Florida', country: 'United States'});
MERGE (l:Location {city: 'Toronto', region: 'Ontario', country: 'Canada'});

// Create Artist nodes with properties

// Batch 1
UNWIND [
  {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4', name: 'Aria Rivers', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/53c3b017-2e65-4a4e-9d3c-f3660f961cf3', is_curated: false, created_at: datetime('2025-09-29T13:28:22.034Z')},
  {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b', name: 'Aurora Moon', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d0a61dae-4ead-4974-ae4c-1e516bb48c29', is_curated: true, created_at: datetime('2025-06-22T05:46:12.242Z')},
  {id: 'a9436f14-53f9-4056-953e-29f560dab5a9', name: 'Violet Cross', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/92506718-1ed4-457c-9a3e-6c4304c574cc', is_curated: false, created_at: datetime('2025-05-15T11:52:59.950Z')},
  {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b', name: 'Lyra Frost', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/022de882-02d8-43cb-9a33-951cb97c1445', is_curated: false, created_at: datetime('2025-11-30T10:32:25.672Z')},
  {id: '759e2449-2616-4d3a-a327-7e3bbd57083e', name: 'Violet Black', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/807dd6f0-26e8-4d0b-a20c-4db149e234da', is_curated: true, created_at: datetime('2025-07-03T01:13:38.427Z')},
  {id: '942d3fd3-2fad-4074-adc9-abb76e638665', name: 'Phoenix Bright', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/da79af62-1316-4aa6-ae35-39c14289e2de', is_curated: false, created_at: datetime('2025-04-11T13:38:52.742Z')},
  {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce', name: 'Luna Phillips', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/db843d6f-e83d-4d2b-bcf0-bc2e220f938e', is_curated: true, created_at: datetime('2025-10-28T06:21:07.579Z')},
  {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb', name: 'Knox Frost', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4c7ea194-1f50-4b2a-8f24-d2d0b24bc66b', is_curated: true, created_at: datetime('2025-10-16T02:40:17.576Z')},
  {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a', name: 'Ivy Star', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d1d32641-c7b5-4aaf-881b-b831259fdba6', is_curated: false, created_at: datetime('2025-08-08T11:54:40.454Z')},
  {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de', name: 'Amara Schwartz', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/96774666-98cf-41ca-a810-84327bacfaa5', is_curated: false, created_at: datetime('2025-11-01T19:25:37.480Z')},
  {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c', name: 'Orion Fox', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8a8c0c3d-3d2a-4d3e-9198-57851dcc0ceb', is_curated: true, created_at: datetime('2025-07-14T07:30:57.719Z')},
  {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7', name: 'Blair Cloud', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a19bff64-1736-465b-b987-906c54fe5d9e', is_curated: false, created_at: datetime('2025-02-10T03:45:27.252Z')},
  {id: 'da6e554a-27e5-493f-a31a-b579036e52bb', name: 'Sky Silver', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/27bc6c83-04cc-440b-90d5-4622bb74442a', is_curated: false, created_at: datetime('2025-02-03T08:41:42.120Z')},
  {id: 'b21a3922-5c2c-4286-a7f3-c586ee2e927b', name: 'Phoenix Flame', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a0b966fc-adbf-480a-bcb0-b6e86873b27e', is_curated: true, created_at: datetime('2025-06-03T02:15:10.934Z')},
  {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba', name: 'Tyler Wilson', location_city: 'Vancouver', location_region: 'British Columbia', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3c501813-5cc2-4dcb-baff-f5ea34060efa', is_curated: true, created_at: datetime('2025-01-12T02:46:30.172Z')},
  {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f', name: 'Cruz Gray', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a5a7f7d1-fa8a-4b71-b7b5-fa833d421878', is_curated: true, created_at: datetime('2025-04-11T04:39:11.749Z')},
  {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b', name: 'Kane Cloud', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/219c2b18-b3e3-4810-9f31-c58aa7221b25', is_curated: true, created_at: datetime('2025-12-18T18:32:11.751Z')},
  {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619', name: 'Sky Flame', location_city: 'Vancouver', location_region: 'British Columbia', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1102a9cd-7f97-4a17-96ce-924c970e5237', is_curated: true, created_at: datetime('2025-12-08T05:38:11.596Z')},
  {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d', name: 'Storm Storm', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/dc4f3dc3-cfa8-4e6f-aff0-1fa7e7192db6', is_curated: false, created_at: datetime('2025-10-18T13:14:21.444Z')},
  {id: 'aae32407-b25d-401e-8c80-aa744a523230', name: 'Phoenix Wild', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b31a10a5-48ac-4872-9e02-235c421a1bc9', is_curated: true, created_at: datetime('2025-12-08T20:21:12.054Z')},
  {id: 'd985253d-7364-4aea-9efb-ab094935b1d1', name: 'Phoenix Bright', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/06be1648-1d85-4a09-b9c2-0fa5f69da6e1', is_curated: true, created_at: datetime('2025-05-19T12:12:54.276Z')},
  {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7', name: 'Lyra Knight', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/fa0a370c-2b54-4e26-8251-bc025845d352', is_curated: false, created_at: datetime('2025-11-01T16:13:01.772Z')},
  {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71', name: 'Ryder Moon', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c6dfcf05-b43a-437a-a0d1-0923c9fbefbf', is_curated: false, created_at: datetime('2025-12-22T12:23:51.153Z')},
  {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb', name: 'Amara Thorn', location_city: 'Montreal', location_region: 'Quebec', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d7352e27-7df4-47ab-98aa-55e628070e5f', is_curated: false, created_at: datetime('2025-05-13T06:28:48.876Z')},
  {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f', name: 'Ryder Sharp', location_city: 'Montreal', location_region: 'Quebec', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/717c2e18-4308-4b99-85a4-7357c62ccf7d', is_curated: true, created_at: datetime('2025-10-26T02:52:08.583Z')},
  {id: '9ccf2900-6eae-4e31-941a-537fd076b26e', name: 'Knox Bright', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/fc16b65f-e0d1-4200-a0d2-412eba6d989e', is_curated: false, created_at: datetime('2025-02-08T03:21:10.644Z')},
  {id: '543f2e52-b849-4819-a72e-670a0bb837b3', name: 'Jade Iron', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e440b55b-e9d7-43f8-b339-74b306692b4d', is_curated: false, created_at: datetime('2025-11-03T23:17:42.392Z')},
  {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec', name: 'Blair Light', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/10c2fed3-ce1f-4d1f-8d80-5b124bb19b80', is_curated: true, created_at: datetime('2025-04-08T09:07:36.067Z')},
  {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647', name: 'Kane Fox', location_city: 'Montreal', location_region: 'Quebec', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8ce9d182-673f-4abd-9766-a32fafb6c8f7', is_curated: true, created_at: datetime('2025-12-04T06:05:05.973Z')},
  {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e', name: 'Dante Moon', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1033bcb3-34a4-49cd-a4a4-c21eda3bc05a', is_curated: false, created_at: datetime('2025-09-19T02:58:28.946Z')},
  {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a', name: 'Axel Anderson', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7f1a180e-69ab-4bc9-a4b9-f73571b4dfe1', is_curated: false, created_at: datetime('2025-11-03T21:04:17.941Z')},
  {id: '5845f507-6538-4cd8-b271-eb8aa11c53cd', name: 'Zephyr Silver', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/23f9cd1e-5816-4976-89e0-84da5ccf822a', is_curated: true, created_at: datetime('2025-01-08T07:15:41.593Z')},
  {id: '8354ec80-dfe5-454e-ae06-224f4550b263', name: 'Ember Thorn', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6e2ff849-074f-4dc5-9b7b-a80a43b0844a', is_curated: true, created_at: datetime('2025-04-13T15:29:28.258Z')},
  {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131', name: 'Jade Silver', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b334496f-b822-4bc9-b4e4-5c918107c96b', is_curated: true, created_at: datetime('2025-12-13T19:32:09.863Z')},
  {id: '3e9af287-58da-40bc-bb97-131be29803b1', name: 'Dante Black', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ffb7b151-1172-47da-a00c-0d3d4df72398', is_curated: false, created_at: datetime('2025-07-21T14:10:15.319Z')},
  {id: '0cc00470-5afc-457d-825e-38cad7829982', name: 'Seraphina Blade', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8c612d06-e7e7-4f63-89ab-17659592fcd8', is_curated: true, created_at: datetime('2025-09-28T23:07:20.900Z')},
  {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15', name: 'Axel Steele', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4dc103cc-4797-480e-9268-08ce7b984fb3', is_curated: false, created_at: datetime('2025-05-17T16:52:18.487Z')},
  {id: 'e952f62a-2618-4286-92a5-dc01dd686041', name: 'Amara Steele', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/847afe37-ff73-491e-881b-b65483879dd8', is_curated: false, created_at: datetime('2025-06-12T01:33:06.339Z')},
  {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6', name: 'Kai Rivers', location_city: 'Sydney', location_region: 'New South Wales', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/174bb876-c645-43cb-bf8d-7cc9af5ee781', is_curated: false, created_at: datetime('2025-01-14T18:19:25.098Z')},
  {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91', name: 'Blaze Hart', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/5746b626-d41c-43b4-9998-3831728b273c', is_curated: false, created_at: datetime('2025-10-06T08:46:08.331Z')},
  {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b', name: 'Storm Stone', location_city: 'Dallas', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/36bff623-8338-4cc4-82d8-373df9ccd392', is_curated: false, created_at: datetime('2025-01-06T13:31:23.155Z')},
  {id: '1f88ee60-8728-472f-a0fa-9f54afbfda10', name: 'Jade Rivers', location_city: 'Dallas', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/551367de-97a7-4c0a-ab4b-cea011bf17ad', is_curated: true, created_at: datetime('2025-07-15T22:16:47.203Z')},
  {id: 'e4bd1bff-e8d8-49e9-b491-574e7a76d155', name: 'Willow Anderson', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0122daed-2dc9-4eec-9751-7c57eb033241', is_curated: false, created_at: datetime('2025-08-04T14:57:36.236Z')},
  {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87', name: 'Storm Star', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/233f9df2-9130-4312-948b-147605992319', is_curated: false, created_at: datetime('2025-03-09T21:05:58.141Z')},
  {id: 'b86e99cc-5956-4f68-9fe3-1d7bb1a2ef0f', name: 'Blair Silver', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ae03fa28-7aa7-4d09-96af-1d96832a1072', is_curated: true, created_at: datetime('2025-06-09T03:28:32.911Z')},
  {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f', name: 'Sophia Silver', location_city: 'Vancouver', location_region: 'British Columbia', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e759abb2-c5c7-47ed-8c62-620410176c69', is_curated: true, created_at: datetime('2025-12-17T06:31:47.916Z')},
  {id: '05668c66-56b9-460b-a950-a57552b65358', name: 'Zephyr Reed', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7bc8b137-2595-433b-a95d-b684ebe77c86', is_curated: true, created_at: datetime('2025-05-15T12:09:11.497Z')},
  {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35', name: 'Tyler Black', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/6a1b14c6-36c6-43a0-9240-34ab16b32b53', is_curated: false, created_at: datetime('2025-09-15T03:25:42.890Z')},
  {id: 'ebf28709-0a85-4601-a684-6609c07dde60', name: 'Willow Storm', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2816697c-c448-45c1-8a93-5b3918d5b593', is_curated: false, created_at: datetime('2025-02-14T07:26:45.854Z')},
  {id: 'ce067719-0280-4116-8d74-76eb38094bd7', name: 'Drake Iron', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/c0e5b0d8-234a-448a-a1a4-08dc9b2e8ffb', is_curated: true, created_at: datetime('2025-08-20T05:03:11.994Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.location_city = artist.location_city,
    a.location_region = artist.location_region,
    a.location_country = artist.location_country,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Batch 2
UNWIND [
  {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb', name: 'Dante Bright', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4f2ccfb9-ac95-43a2-a2b9-e3e81d71e470', is_curated: false, created_at: datetime('2025-06-17T12:55:06.851Z')},
  {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9', name: 'Elena Cross', location_city: 'Vancouver', location_region: 'British Columbia', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f5cfa61c-cef4-40b5-8d20-50574f191746', is_curated: true, created_at: datetime('2025-04-27T05:09:44.435Z')},
  {id: '557b2eaf-3729-40b4-9b06-de327bad29e0', name: 'Zara Steele', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/091f89af-87e5-4c3c-8d92-dfc820eb66ef', is_curated: true, created_at: datetime('2025-04-27T12:56:48.871Z')},
  {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e', name: 'Dante Rivers', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/afee277b-f55b-4cf0-9d1b-7be9195b7e44', is_curated: false, created_at: datetime('2026-01-01T22:47:54.467Z')},
  {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7', name: 'Ivy Storm', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8c834909-4c41-4612-9a55-8890441d1690', is_curated: false, created_at: datetime('2025-07-17T22:43:05.421Z')},
  {id: '1829395c-6eeb-4333-a3ca-ff3477f0ce59', name: 'Cruz Thorn', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ed84eb4e-8605-40d0-a6c1-a668f128ca63', is_curated: true, created_at: datetime('2025-10-16T17:24:32.764Z')},
  {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95', name: 'Blair Martinez', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/44417908-d176-4c8a-9557-8eca152e655c', is_curated: true, created_at: datetime('2025-08-20T09:14:20.429Z')},
  {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9', name: 'Luna Chen', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3b5a6ff3-d53e-41f3-a5b7-3b94b529e99a', is_curated: true, created_at: datetime('2025-05-26T18:06:13.200Z')},
  {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae', name: 'Felix Star', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3ab8fac2-e3fc-4958-bb17-86e3e25a4807', is_curated: false, created_at: datetime('2025-03-26T05:55:13.694Z')},
  {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3', name: 'Elena Flame', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f2d16efe-faad-46a5-8f80-15f0f692b643', is_curated: true, created_at: datetime('2025-01-25T22:13:59.796Z')},
  {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2', name: 'Drake Young', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b90c6a6d-1acb-45c7-9f26-db666843a1e7', is_curated: true, created_at: datetime('2025-06-30T12:23:36.063Z')},
  {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53', name: 'Willow Wild', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b781ac40-7dd2-4661-9492-1b66dc180051', is_curated: false, created_at: datetime('2025-03-17T10:15:36.515Z')},
  {id: 'b91c1d62-f7ec-42fa-a043-772be31be891', name: 'Seraphina Star', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/824a1065-7cb6-417e-8b1b-a967913fc458', is_curated: false, created_at: datetime('2025-07-07T03:01:45.631Z')},
  {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f', name: 'Zara Wild', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d8609f33-1b0f-4baf-ac03-64802a12a3a3', is_curated: false, created_at: datetime('2025-11-14T21:29:45.296Z')},
  {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2', name: 'Knox Martinez', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1aca1fc5-b0ea-4a4c-88f2-dea1e3273130', is_curated: false, created_at: datetime('2025-12-13T16:14:03.035Z')},
  {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d', name: 'Blair Knight', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a6823f23-e472-4dc7-a9dc-f1b9e79fefdf', is_curated: false, created_at: datetime('2025-07-09T06:57:38.566Z')},
  {id: '387217c0-aec5-43b0-8d8a-357c08424317', name: 'Aurora Gray', location_city: 'Sydney', location_region: 'New South Wales', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/5da0085c-5356-493e-931c-38ee66ed610b', is_curated: true, created_at: datetime('2025-09-14T20:49:53.043Z')},
  {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91', name: 'Axel Silver', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1cae83ba-9cd4-4c33-92f1-867c68fe8de9', is_curated: false, created_at: datetime('2025-09-28T12:46:44.926Z')},
  {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f', name: 'Kane Gray', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/979b1de6-808b-474d-8fac-7a603a2ecef2', is_curated: true, created_at: datetime('2025-01-29T07:15:24.380Z')},
  {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b', name: 'Dante Cloud', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d62b8059-1b8f-4c2b-b3bd-a0db4a2421f9', is_curated: false, created_at: datetime('2025-10-04T10:57:36.260Z')},
  {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2', name: 'Miss Vampira Frost', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6634deed-c3e0-4c50-9b06-cfcaf8358772', is_curated: false, created_at: datetime('2025-07-02T07:16:39.584Z')},
  {id: '24aa166e-43d9-4f88-904e-05c59bc689af', name: 'Drake Phillips', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b9fb1bb9-f816-404d-b3d6-deda25ead10a', is_curated: false, created_at: datetime('2025-09-27T18:10:11.953Z')},
  {id: '33485588-ed73-49a8-ad21-e279480614ab', name: 'Jaxon Anderson', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/61082895-82dd-47cf-b435-3dbf58ff7b75', is_curated: true, created_at: datetime('2025-03-29T17:33:31.019Z')},
  {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c', name: 'Sky Silver', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3f3f9d7c-d358-4f56-a33d-52869eade454', is_curated: false, created_at: datetime('2025-04-06T06:44:24.817Z')},
  {id: '0c133bba-7318-4405-ad52-0499289bfe38', name: 'Lilith Frost', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/28d82e03-40a5-4441-aad0-3e9993901a81', is_curated: true, created_at: datetime('2025-02-01T02:18:29.245Z')},
  {id: '30a4c0cb-bc9f-4794-8519-a2496d5076c5', name: 'Lilith Blade', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/86d229d8-0cf3-4335-9648-ecd49d346582', is_curated: false, created_at: datetime('2025-11-06T06:42:57.380Z')},
  {id: '61a2924d-df0c-45e6-a6df-89082cd04f15', name: 'Sky Star', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/97937552-68cc-471f-8a4d-7209fab5f74a', is_curated: false, created_at: datetime('2025-09-09T11:17:36.852Z')},
  {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd', name: 'Wolf Young', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/228136a3-fb01-4601-9583-3c78660f9763', is_curated: true, created_at: datetime('2025-12-12T13:14:20.737Z')},
  {id: '5ee5b329-70d4-41ec-900e-e7217adec545', name: 'Elena Steele', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b6ab0f1e-1d31-41b3-bc17-fdcfc9adb8fa', is_curated: false, created_at: datetime('2025-10-09T14:10:02.238Z')},
  {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4', name: 'Willow Wild', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/77966d2f-ce4a-4e2b-8765-401b0817484e', is_curated: false, created_at: datetime('2025-05-16T14:58:09.364Z')},
  {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab', name: 'Jaxon Wild', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/931f6c6c-da28-4dd3-818f-efd9e0b7baa1', is_curated: false, created_at: datetime('2025-03-10T23:12:33.689Z')},
  {id: 'c29e6c49-17f9-4c9f-91bc-f4c95a7c8ab8', name: 'Ivy Wolfe', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/95cb31b2-1148-4392-b77a-1bb439db83cc', is_curated: true, created_at: datetime('2025-10-24T21:19:29.355Z')},
  {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb', name: 'Jade Cloud', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7f098919-dbdb-47a0-b1fa-72d13d34648e', is_curated: false, created_at: datetime('2025-04-25T00:46:22.213Z')},
  {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf', name: 'Blaze Reed', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9eb378f0-eede-42fb-8108-51ec8fe95e41', is_curated: true, created_at: datetime('2025-11-26T21:35:04.564Z')},
  {id: '0aafa0b8-cb74-4648-8746-12e2119ea4f2', name: 'Lilith Rivers', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/38a854ec-fc67-45ae-9da4-249d21c41968', is_curated: true, created_at: datetime('2025-12-10T22:27:51.351Z')},
  {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52', name: 'Zephyr Rivers', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7a756843-8640-436b-94ab-52ab1c6e16e1', is_curated: false, created_at: datetime('2025-06-04T19:09:14.335Z')},
  {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9', name: 'Kane Gray', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/916b450b-edaf-459f-8e01-0441c8c027b3', is_curated: false, created_at: datetime('2025-06-18T12:51:45.414Z')},
  {id: 'bc83de6f-08e0-4b37-8300-08b105622431', name: 'Marcus Black', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9fc0443d-59ea-49b5-9449-f4218327ca4e', is_curated: false, created_at: datetime('2025-05-19T22:24:21.102Z')},
  {id: 'cf54fb41-0aba-45ca-96ca-783b369b94d6', name: 'Violet Steele', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/33e4fc9e-f296-455c-aade-98888e3bb6d0', is_curated: true, created_at: datetime('2025-04-08T20:26:12.413Z')},
  {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055', name: 'Jaxon Schwartz', location_city: 'Sydney', location_region: 'New South Wales', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6c95a609-4429-464f-ae33-2f02a882de37', is_curated: false, created_at: datetime('2025-04-04T19:37:40.406Z')},
  {id: 'ed4e628e-7125-4186-870d-2f0190be9996', name: 'Sage Steele', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9ea5ebac-4661-404b-a5af-92a851dea85a', is_curated: false, created_at: datetime('2025-08-11T11:51:25.910Z')},
  {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf', name: 'Kai Fox', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4e6087b7-bd16-4b29-bbac-29d3e600f7bf', is_curated: true, created_at: datetime('2025-05-05T05:54:19.759Z')},
  {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1', name: 'Knox Storm', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a76cf0db-8681-4038-b991-e78aec96b3b9', is_curated: true, created_at: datetime('2025-07-15T02:59:37.390Z')},
  {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822', name: 'Steel Cross', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/18982c6c-fe28-42e4-85f6-9081a81747de', is_curated: false, created_at: datetime('2025-04-14T22:05:04.869Z')},
  {id: '2bafc835-8784-4965-8d56-9b40bbca55e7', name: 'Raven Storm', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0f478546-4c07-4f3d-bd57-e4e2f57dd358', is_curated: true, created_at: datetime('2025-04-20T00:11:43.034Z')},
  {id: 'ac5c8489-28cd-42ce-8e18-3ff47c1c95b6', name: 'Axel Bold', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f34f2f05-855c-4d69-91f6-1bf5dd436975', is_curated: true, created_at: datetime('2025-12-24T08:48:09.644Z')},
  {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404', name: 'Nova Hart', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/09df5f58-7213-4697-8cda-8a67c654d253', is_curated: false, created_at: datetime('2025-05-02T15:37:33.771Z')},
  {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e', name: 'Tyler Gray', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/0b32fee3-6cbb-4e05-bc04-e44d58c784ec', is_curated: true, created_at: datetime('2025-02-21T14:36:36.845Z')},
  {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b', name: 'Zephyr Wolfe', location_city: 'Toronto', location_region: 'Ontario', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0739a843-9c71-48b7-8aca-79a29c56bc91', is_curated: true, created_at: datetime('2025-11-22T03:31:45.942Z')},
  {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868', name: 'Ryder Fox', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6d3567fc-401c-4e6a-b750-7d59fe5f76cc', is_curated: false, created_at: datetime('2025-01-22T13:25:10.762Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.location_city = artist.location_city,
    a.location_region = artist.location_region,
    a.location_country = artist.location_country,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Batch 3
UNWIND [
  {id: 'cfe93205-8a1d-4d07-a493-859cc38cce8f', name: 'Zane Frost', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4b314e89-6a4e-4835-b2dc-56751efac939', is_curated: false, created_at: datetime('2025-08-13T17:31:30.062Z')},
  {id: 'c01b1464-4235-42ca-9984-7e87212c5b67', name: 'Elena Moon', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e71c745f-94f9-4cbb-9d0a-c571ef656623', is_curated: false, created_at: datetime('2025-10-11T05:45:22.830Z')},
  {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228', name: 'Amara Hart', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/feb8c1c4-c47b-4754-8c75-aaf589f73511', is_curated: false, created_at: datetime('2025-02-06T14:42:18.842Z')},
  {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72', name: 'Luna Cloud', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e989e4de-b424-4abc-ac7d-3622be738378', is_curated: true, created_at: datetime('2025-01-19T12:41:32.390Z')},
  {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed', name: 'Tyler Star', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4f3def2c-3a3a-406f-96d4-0daef5177aa8', is_curated: false, created_at: datetime('2025-05-29T17:22:52.969Z')},
  {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9', name: 'Elena Flame', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e75a02f7-2d94-4734-97e1-2ec299508506', is_curated: false, created_at: datetime('2025-07-04T04:27:10.243Z')},
  {id: '40a56e76-f6bc-488d-a3c6-434f39791e97', name: 'Ryder Storm', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9b585494-e811-40a8-b5dd-2fa38bbc0308', is_curated: false, created_at: datetime('2025-03-23T18:16:49.598Z')},
  {id: '5ff32a33-48d1-461c-bd6a-4bacde579c3d', name: 'Luna Storm', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a92db33f-90d9-4263-8fc8-de102b96c094', is_curated: true, created_at: datetime('2025-06-24T17:16:54.646Z')},
  {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0', name: 'Amara Light', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/77b53222-fceb-4cfc-a004-652c8a69e184', is_curated: true, created_at: datetime('2025-08-29T05:04:07.528Z')},
  {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1', name: 'Kai Iron', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8a75dd22-bb1b-4d2a-928e-54dd925d240c', is_curated: false, created_at: datetime('2025-01-31T00:26:04.991Z')},
  {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c', name: 'Lyra Moon', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/098ecc99-4953-4fed-a09f-5ac2afdeb846', is_curated: true, created_at: datetime('2025-08-08T15:00:21.178Z')},
  {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf', name: 'Jaxon Anderson', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/67f40cb3-7aa4-42e8-af8f-c34a27a64283', is_curated: false, created_at: datetime('2025-02-12T16:12:35.076Z')},
  {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998', name: 'Felix Star', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1a23985c-6073-40e6-8d3a-9ff0bae2365c', is_curated: false, created_at: datetime('2025-03-23T01:40:19.355Z')},
  {id: 'de7471f0-eb08-430f-a039-d076773cc291', name: 'Miss Vampira Cloud', location_city: 'Sydney', location_region: 'New South Wales', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b95baa3f-5f73-433c-85c0-284ef6e557a3', is_curated: true, created_at: datetime('2025-12-29T17:40:55.327Z')},
  {id: '8c9a497f-28b2-4463-80cd-a824de75309b', name: 'Raven Cloud', location_city: 'Toronto', location_region: 'Ontario', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/08347fe0-e515-4b88-956f-d332b95eb6e8', is_curated: false, created_at: datetime('2025-09-10T07:50:38.169Z')},
  {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0', name: 'Felix Gray', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f8187358-01e6-45b5-82cc-cb7a32c7236e', is_curated: true, created_at: datetime('2025-12-06T06:56:06.168Z')},
  {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf', name: 'Felix Reed', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/934ddfe6-4c14-41b2-8b7f-924927859d7c', is_curated: true, created_at: datetime('2025-03-17T18:21:13.472Z')},
  {id: '623141ca-9ee8-456b-8516-ed997dc40fdc', name: 'Elena Bright', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4ee012fa-9d45-43de-b79e-8c25c961ce14', is_curated: true, created_at: datetime('2025-01-16T14:53:03.754Z')},
  {id: '819a9310-fad3-4062-8534-057c17f90d84', name: 'Axel Bold', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a8868a3b-f01a-4538-966d-df20c516d4a1', is_curated: false, created_at: datetime('2025-09-10T21:53:10.112Z')},
  {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281', name: 'Blaze Star', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/42630cfa-3063-4a28-80d9-ad0a034552d5', is_curated: false, created_at: datetime('2025-07-22T06:58:17.363Z')},
  {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797', name: 'Storm Cross', location_city: 'Dallas', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6eb4f36e-cec0-4f39-ba72-1c8b50dd6218', is_curated: true, created_at: datetime('2025-05-31T01:50:50.995Z')},
  {id: '47a1f895-3ac0-41f2-832e-765193815ad3', name: 'Jaxon Schwartz', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/70d313dc-257f-4d33-81cd-efb1599ac0b7', is_curated: false, created_at: datetime('2025-12-16T15:39:07.629Z')},
  {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe', name: 'Marcus Thorn', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0044496d-a325-427f-82d6-b76ec860e0cc', is_curated: false, created_at: datetime('2025-08-02T09:36:01.270Z')},
  {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab', name: 'Ember Flame', location_city: 'Phoenix', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/714b741f-40bd-4be9-b199-12f8fafa16d7', is_curated: false, created_at: datetime('2025-10-17T02:00:12.857Z')},
  {id: 'df1e9684-b150-4ad4-a806-4d14367a43b0', name: 'Seraphina Phillips', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8dc76a22-ec5d-4707-92ab-a1e9d6820cad', is_curated: true, created_at: datetime('2025-10-11T03:51:40.049Z')},
  {id: 'b23f0fde-0147-4416-91f0-90e5491929d3', name: 'Jade Knight', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d8f12e7a-2e21-4f21-baee-5c03f653037e', is_curated: false, created_at: datetime('2025-10-01T02:43:17.767Z')},
  {id: '842bb415-dcde-4020-8769-2d33424abac5', name: 'Sky Flame', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3e6ef0ce-410e-4148-8caf-4286a1a7ae32', is_curated: false, created_at: datetime('2025-11-09T23:31:13.549Z')},
  {id: '6155742e-c89e-44d7-91c7-492be6fa243f', name: 'Luna Anderson', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/13080343-8ce5-440e-8db7-e5999a55ec7b', is_curated: false, created_at: datetime('2025-10-20T15:34:51.039Z')},
  {id: '388b2f3d-0088-450d-9583-4c46a837a962', name: 'Phoenix Cross', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/575ad532-c524-44d2-83ac-07181ce62358', is_curated: false, created_at: datetime('2025-11-29T23:07:52.196Z')},
  {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a', name: 'Raven Wolfe', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b96fd03e-0314-4d56-83fb-79d9b502da86', is_curated: false, created_at: datetime('2025-12-07T03:54:08.953Z')},
  {id: '0e7b6fae-c843-4648-be4c-265b5450594c', name: 'Blair Chen', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d516d97c-7431-4579-b939-b28a79429fe0', is_curated: false, created_at: datetime('2025-08-31T08:01:36.720Z')},
  {id: '59538def-8743-47b7-9ec6-41718ba66421', name: 'Violet Wilson', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e200f814-2e80-43bf-87fb-9d09434b5f72', is_curated: false, created_at: datetime('2025-09-10T06:57:33.492Z')},
  {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624', name: 'Amara Knight', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7ee72cbd-83a8-492a-82d1-c49333499e6b', is_curated: true, created_at: datetime('2025-04-23T20:51:37.739Z')},
  {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086', name: 'River Bold', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/717b2444-64fa-4bdc-a8f8-4a54a2551223', is_curated: false, created_at: datetime('2025-04-07T07:29:19.785Z')},
  {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2', name: 'Amara Phillips', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f6c0f4b7-46cf-4d1a-bcec-70fab63abe6d', is_curated: false, created_at: datetime('2025-02-06T06:11:50.655Z')},
  {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92', name: 'Sophia Black', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6396d2e7-ae12-4090-a644-36260d57e86b', is_curated: true, created_at: datetime('2025-01-16T06:42:47.150Z')},
  {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5', name: 'Blair Steele', location_city: 'Dallas', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/31f50305-05b6-4267-a71e-29115a027f83', is_curated: false, created_at: datetime('2025-03-05T05:47:00.356Z')},
  {id: '340c8da6-de8b-4be9-873b-1ea579afd71d', name: 'Luna Star', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0c87744d-7ea5-4fd7-9b6b-cbc98ea765c0', is_curated: true, created_at: datetime('2025-09-21T20:53:12.732Z')},
  {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a', name: 'Sky Bold', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7e586bdf-a1ed-44fd-b9a7-3d139501f11d', is_curated: false, created_at: datetime('2025-07-16T04:10:21.770Z')},
  {id: '8639cc95-0939-43bf-947b-667e5c5aebcc', name: 'Nova Martinez', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/73cf9b12-1df8-4f80-94c4-61a8405ae312', is_curated: false, created_at: datetime('2025-07-23T04:39:23.713Z')},
  {id: 'a14178ae-3b12-4252-9db2-7916aea7c188', name: 'Drake Chen', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8e99dff2-bbf8-4916-915b-f00bdbe940fc', is_curated: false, created_at: datetime('2025-01-28T19:14:42.450Z')},
  {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3', name: 'Lyra Iron', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9c87a3e6-3800-4639-b49b-497b1f354aa3', is_curated: true, created_at: datetime('2025-06-11T03:47:13.519Z')},
  {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35', name: 'Storm Blade', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d6a53721-07b4-46c8-97db-7786f271f5b9', is_curated: true, created_at: datetime('2025-12-05T05:56:07.216Z')},
  {id: '7f3124b1-2895-4109-9532-44319dd7e6dc', name: 'Sage Phillips', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/41af9580-1277-4d74-b610-e5f74d2844bc', is_curated: true, created_at: datetime('2025-03-25T19:17:34.682Z')},
  {id: 'd6c31b01-a477-440d-830c-298d3e8e46df', name: 'Ember Iron', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3af98590-1dd7-4033-b816-342e0a4df71a', is_curated: false, created_at: datetime('2025-04-08T10:57:12.759Z')},
  {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832', name: 'Luna Wild', location_city: 'Dallas', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/403a2d8b-ae3b-4960-bb6f-879c12a5cb40', is_curated: true, created_at: datetime('2025-10-02T03:33:40.498Z')},
  {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123', name: 'Zane Bright', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/46629bc4-d670-4c0e-b3c7-0410e0f36723', is_curated: true, created_at: datetime('2025-02-23T22:35:41.155Z')},
  {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65', name: 'Ember Light', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6558d9f6-0666-46bc-8311-954686be2c41', is_curated: false, created_at: datetime('2025-07-03T06:31:23.117Z')},
  {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00', name: 'Jade Reed', location_city: 'Toronto', location_region: 'Ontario', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7ba50dcd-aa49-4955-8eb1-3c4cc3bdd232', is_curated: false, created_at: datetime('2025-10-08T15:17:04.981Z')},
  {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692', name: 'Aurora Iron', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ac8d960e-040a-4038-bb93-f068f1c66034', is_curated: false, created_at: datetime('2025-05-29T19:05:46.179Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.location_city = artist.location_city,
    a.location_region = artist.location_region,
    a.location_country = artist.location_country,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Batch 4
UNWIND [
  {id: 'a87cce35-b813-47ca-9323-99b4392f8337', name: 'Elena Martinez', location_city: 'Newark', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2cdfbf4e-6873-4e52-9af4-42a13f70647c', is_curated: true, created_at: datetime('2025-09-08T04:09:15.574Z')},
  {id: '3a6002ff-712a-441e-a483-e2b81e3294ef', name: 'Ryder Steele', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/33ee99df-aac4-4eec-a2a9-68d3503f230e', is_curated: true, created_at: datetime('2025-04-30T07:15:07.823Z')},
  {id: '1c837b81-33cb-48d6-bf1f-786973a2c500', name: 'Blaze Storm', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cd80584c-8535-46ae-944c-5b1a6204f8c3', is_curated: false, created_at: datetime('2025-09-01T03:02:45.486Z')},
  {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95', name: 'Zane Wilson', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2a8a2040-d875-4f5e-b1c5-9dc4ebab998c', is_curated: false, created_at: datetime('2025-09-28T08:17:09.931Z')},
  {id: '873cc4c0-d115-4725-8746-1539f86ef19a', name: 'Sky Cross', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0ea84aa8-853c-4c16-a10f-c2dbd493910e', is_curated: true, created_at: datetime('2025-01-31T22:17:52.212Z')},
  {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a', name: 'Kai Fox', location_city: 'Montreal', location_region: 'Quebec', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2dbe6d40-31a9-43f2-aca8-f0d642ae80ec', is_curated: false, created_at: datetime('2025-06-01T05:02:50.470Z')},
  {id: 'f122d140-03a0-451e-93e4-c2cb23683c75', name: 'Violet Phillips', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9c8a55f8-6549-4189-89a0-3213f61ac3c8', is_curated: true, created_at: datetime('2025-03-30T21:55:42.614Z')},
  {id: '6c331293-5e07-4bca-a7f6-76835d8b598a', name: 'Amara Phillips', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/49cc7ab9-eddf-4241-b810-55259a3d9bba', is_curated: true, created_at: datetime('2025-05-21T02:34:32.621Z')},
  {id: '2dc45f68-d209-4674-bdf7-fac60eac77be', name: 'Sage Light', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2d235180-86e3-4d5a-a3f3-650af8a646b9', is_curated: false, created_at: datetime('2025-11-14T17:51:51.192Z')},
  {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02', name: 'Aria Frost', location_city: 'Toronto', location_region: 'Ontario', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/744b79cf-fdde-4ad3-acbf-8dc7a87f17be', is_curated: true, created_at: datetime('2025-12-25T12:45:32.810Z')},
  {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e', name: 'Raven Flame', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c7ac9b63-1643-430b-b6ae-7d601b0c8d51', is_curated: true, created_at: datetime('2025-03-17T04:22:31.192Z')},
  {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89', name: 'Cruz Stone', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d085de18-0ed6-400e-9cef-2d4ff72376c1', is_curated: false, created_at: datetime('2025-12-16T00:13:48.885Z')},
  {id: 'b36730ba-387a-4ce0-93a9-dd4d84960f09', name: 'Cruz Dark', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/abe4c68b-2f2c-4452-91af-641a50962c82', is_curated: true, created_at: datetime('2025-07-20T03:33:32.846Z')},
  {id: 'a2435552-8403-4d90-98fa-391502aa7e1a', name: 'Kane Reed', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/725fba60-1d5d-4b75-9a9f-c7d506b20046', is_curated: false, created_at: datetime('2025-01-14T03:54:22.208Z')},
  {id: '8686b250-2926-43df-8678-e204d3d3a9df', name: 'Seraphina Sharp', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9ced4f02-e8d5-43a9-a937-58d8fe541182', is_curated: false, created_at: datetime('2025-10-29T06:16:57.825Z')},
  {id: '4fe7264b-6cf1-4957-a560-785159b50c30', name: 'Blair Stone', location_city: 'Toronto', location_region: 'Ontario', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0d3ac98c-9b21-46c8-aa94-ee0f9c129dc2', is_curated: false, created_at: datetime('2025-09-22T05:26:38.052Z')},
  {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6', name: 'Miss Vampira Rivers', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/31234065-5839-457a-a126-46dea4a8d29b', is_curated: true, created_at: datetime('2025-01-31T12:47:13.526Z')},
  {id: '98c6c5d4-12cd-4434-b875-77ea66c46342', name: 'Drake Reed', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f783942b-f4d0-401b-acb5-5f8ffb7fc506', is_curated: false, created_at: datetime('2025-02-04T17:18:40.307Z')},
  {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc', name: 'Ember Young', location_city: 'Toronto', location_region: 'Ontario', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/00354a3b-990f-4510-9c9b-aef98ec1ae7c', is_curated: false, created_at: datetime('2025-04-10T14:44:08.611Z')},
  {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283', name: 'Lyra Cross', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1fe81967-ed55-4ba9-862b-264b6bc53a77', is_curated: false, created_at: datetime('2025-02-22T21:09:23.766Z')},
  {id: '25707142-b1b6-4699-829a-6acb685b29e7', name: 'Asher Schwartz', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b5a2c92b-ee4c-4ee1-b5f2-26f75fa667bf', is_curated: false, created_at: datetime('2025-07-05T20:34:42.484Z')},
  {id: 'daabc26e-bb55-447d-8356-0f7a833b6104', name: 'Miss Vampira Phillips', location_city: 'Jersey City', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e6687f29-e497-4ac7-839a-95ea61f8fb10', is_curated: false, created_at: datetime('2025-11-06T00:09:48.784Z')},
  {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e', name: 'Dante Thorn', location_city: 'Manhattan', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ff8840c4-511d-4535-812f-18af9089c5e3', is_curated: false, created_at: datetime('2025-06-21T02:52:34.974Z')},
  {id: '37174f32-5038-46c0-92ef-4629ca6234d8', name: 'Raven Rivers', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f88e9d26-a2fd-440f-8b8b-7a8f0220152d', is_curated: false, created_at: datetime('2025-07-20T07:58:57.839Z')},
  {id: '33afdffc-0751-48ec-bbbb-e7c76ae4c786', name: 'Violet Cross', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/5e575848-163c-42b2-88ea-ab3d0602b1c0', is_curated: false, created_at: datetime('2025-01-23T02:17:38.370Z')},
  {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a', name: 'Wolf Dark', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e0eda7ed-466d-4cd7-9585-76be36a8e075', is_curated: false, created_at: datetime('2025-04-10T21:13:23.120Z')},
  {id: '064d66cc-5d95-46ee-9139-403c71fdd16e', name: 'Marcus Bold', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8b75ee80-e411-4805-a82d-cb45eb9a339f', is_curated: true, created_at: datetime('2025-03-18T21:17:42.754Z')},
  {id: '6bfb7fc8-b187-4484-998d-6031b10f6371', name: 'Raven Star', location_city: 'San Diego', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6535d9d6-5ba2-4340-9a8c-ee1e6e9d36a0', is_curated: false, created_at: datetime('2025-04-10T16:07:23.427Z')},
  {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb', name: 'Cruz Flame', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e996798c-faff-4eab-b252-f1086e9d496c', is_curated: true, created_at: datetime('2025-11-23T07:05:58.944Z')},
  {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126', name: 'Luna Martinez', location_city: 'Houston', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e8ec508b-e000-4715-b740-a8c49b8e8336', is_curated: false, created_at: datetime('2025-03-24T19:27:38.174Z')},
  {id: '62e09fb8-95db-47c9-9752-a2e6814cd910', name: 'Tyler Cloud', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/29dd88ad-152f-4bb0-ae35-bdce1d705950', is_curated: false, created_at: datetime('2025-12-10T09:58:51.115Z')},
  {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35', name: 'Steel Wild', location_city: 'Tampa', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cd5baa8b-788b-4776-81b8-2b6018e86461', is_curated: false, created_at: datetime('2025-07-21T04:16:46.803Z')},
  {id: '6cf0c158-2361-4019-b58e-0a697db8f056', name: 'Aria Steele', location_city: 'Vancouver', location_region: 'British Columbia', location_country: 'Canada', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6d5399cc-9a60-40b4-adf5-975cf606954e', is_curated: false, created_at: datetime('2025-11-02T22:35:26.669Z')},
  {id: '44f377a4-5490-4aca-9112-92fce03d5ff6', name: 'Luna Wolfe', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8f5ca844-65da-4abd-a472-13004f6cecfd', is_curated: true, created_at: datetime('2025-02-12T23:37:36.465Z')},
  {id: '1d558228-498d-4496-b3e1-78286c675e71', name: 'Ryder Cloud', location_city: 'Tucson', location_region: 'Arizona', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d57d1915-0c27-4b27-9ff1-a9f80a6952ec', is_curated: true, created_at: datetime('2025-08-26T19:25:28.298Z')},
  {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de', name: 'Luna Chen', location_city: 'Burlington', location_region: 'Vermont', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/eac42a4a-15bb-419e-888c-57dd7ddade28', is_curated: false, created_at: datetime('2025-02-01T08:40:06.987Z')},
  {id: 'a10c47be-07d7-4795-9079-807a494a6258', name: 'Blaze Knight', location_city: 'Perth', location_region: 'Western Australia', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/814eb61d-6177-45f0-8543-d970ec6df79b', is_curated: true, created_at: datetime('2025-08-12T07:07:14.177Z')},
  {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4', name: 'Raven Iron', location_city: 'San Francisco', location_region: 'California', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6bd57a9a-6ffc-4f61-9357-3afaaf68e2db', is_curated: false, created_at: datetime('2025-05-07T15:44:06.814Z')},
  {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49', name: 'Zara Cross', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/84f54fa9-a5e7-4464-9f76-f1853b91750a', is_curated: true, created_at: datetime('2025-09-01T23:20:42.362Z')},
  {id: '00a038b1-524d-480c-b634-a50593081c8c', name: 'Luna Light', location_city: 'Miami', location_region: 'Florida', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/bad43734-cb4d-4abc-9697-a9ff37153c32', is_curated: true, created_at: datetime('2025-04-13T22:22:34.855Z')},
  {id: 'd7319521-ca55-4c66-937b-28d4307b32d7', name: 'Zephyr Fox', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/41e18ece-fb8d-4ec8-9f86-4fd80586c3d2', is_curated: true, created_at: datetime('2025-04-28T14:12:09.589Z')},
  {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb', name: 'Knox Black', location_city: 'Portland', location_region: 'Oregon', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/13e1e9d5-eb98-4275-9a15-9872d99f6d76', is_curated: true, created_at: datetime('2025-03-20T09:49:11.790Z')},
  {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d', name: 'Luna Wilson', location_city: 'Austin', location_region: 'Texas', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a21289bc-73db-4b46-9e46-85e76ceec34e', is_curated: false, created_at: datetime('2025-06-13T20:13:33.304Z')},
  {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b', name: 'Ryder Gray', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f68db921-5aac-486a-9430-cfa047f60042', is_curated: false, created_at: datetime('2025-06-04T13:29:23.279Z')},
  {id: '12f9f8b5-4422-4151-8dcb-076529349277', name: 'Blair Dark', location_city: 'Melbourne', location_region: 'Victoria', location_country: 'Australia', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/429603d1-ae10-46e6-b623-ab7840d64e2a', is_curated: true, created_at: datetime('2025-04-18T10:44:29.459Z')},
  {id: 'd9550683-6866-4dec-a927-c82ba207eac4', name: 'Drake Bold', location_city: 'Los Angeles', location_region: 'California', location_country: 'United States', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/e6581548-efd8-4a68-bc28-2826cc3d7fae', is_curated: true, created_at: datetime('2025-03-10T15:10:04.789Z')},
  {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730', name: 'Steel Wolfe', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8c791c5b-ec4e-4d97-ba89-3c6631e9fee2', is_curated: true, created_at: datetime('2025-11-25T07:22:03.867Z')},
  {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423', name: 'Knox Phillips', location_city: 'Brooklyn', location_region: 'New York', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f8123689-de7c-4d10-8788-48c39e418e21', is_curated: false, created_at: datetime('2025-11-11T19:28:53.503Z')},
  {id: '0df583e5-8422-4995-84c3-6b0d33ce732f', name: 'River Wilson', location_city: 'Denver', location_region: 'Colorado', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e8dc9af8-d2ae-4a59-bed9-b47941a20a3a', is_curated: true, created_at: datetime('2025-04-23T09:02:58.963Z')},
  {id: '1bd804dc-7da1-405d-8da9-61257ae42e27', name: 'Blair Iron', location_city: 'Ewing Township', location_region: 'New Jersey', location_country: 'United States', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6b6bd98d-f869-46f7-9b05-475f0ee46679', is_curated: true, created_at: datetime('2025-01-13T17:22:22.450Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.location_city = artist.location_city,
    a.location_region = artist.location_region,
    a.location_country = artist.location_country,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Create LOCATED_IN relationships
MATCH (a:Artist), (l:Location)
WHERE a.location_city = l.city AND a.location_region = l.region AND a.location_country = l.country
MERGE (a)-[:LOCATED_IN]->(l);

// Create PRACTICES_STYLE relationships
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'da6e554a-27e5-493f-a31a-b579036e52bb'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b21a3922-5c2c-4286-a7f3-c586ee2e927b'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b21a3922-5c2c-4286-a7f3-c586ee2e927b'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b21a3922-5c2c-4286-a7f3-c586ee2e927b'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5845f507-6538-4cd8-b271-eb8aa11c53cd'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5845f507-6538-4cd8-b271-eb8aa11c53cd'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3e9af287-58da-40bc-bb97-131be29803b1'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1f88ee60-8728-472f-a0fa-9f54afbfda10'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1f88ee60-8728-472f-a0fa-9f54afbfda10'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e4bd1bff-e8d8-49e9-b491-574e7a76d155'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e4bd1bff-e8d8-49e9-b491-574e7a76d155'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e4bd1bff-e8d8-49e9-b491-574e7a76d155'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b86e99cc-5956-4f68-9fe3-1d7bb1a2ef0f'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1829395c-6eeb-4333-a3ca-ff3477f0ce59'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '387217c0-aec5-43b0-8d8a-357c08424317'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '24aa166e-43d9-4f88-904e-05c59bc689af'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '33485588-ed73-49a8-ad21-e279480614ab'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '30a4c0cb-bc9f-4794-8519-a2496d5076c5'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '61a2924d-df0c-45e6-a6df-89082cd04f15'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '61a2924d-df0c-45e6-a6df-89082cd04f15'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '61a2924d-df0c-45e6-a6df-89082cd04f15'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c29e6c49-17f9-4c9f-91bc-f4c95a7c8ab8'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0aafa0b8-cb74-4648-8746-12e2119ea4f2'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bc83de6f-08e0-4b37-8300-08b105622431'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bc83de6f-08e0-4b37-8300-08b105622431'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bc83de6f-08e0-4b37-8300-08b105622431'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bc83de6f-08e0-4b37-8300-08b105622431'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cf54fb41-0aba-45ca-96ca-783b369b94d6'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac5c8489-28cd-42ce-8e18-3ff47c1c95b6'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cfe93205-8a1d-4d07-a493-859cc38cce8f'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cfe93205-8a1d-4d07-a493-859cc38cce8f'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cfe93205-8a1d-4d07-a493-859cc38cce8f'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '40a56e76-f6bc-488d-a3c6-434f39791e97'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '40a56e76-f6bc-488d-a3c6-434f39791e97'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5ff32a33-48d1-461c-bd6a-4bacde579c3d'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'de7471f0-eb08-430f-a039-d076773cc291'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'de7471f0-eb08-430f-a039-d076773cc291'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8c9a497f-28b2-4463-80cd-a824de75309b'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '623141ca-9ee8-456b-8516-ed997dc40fdc'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'df1e9684-b150-4ad4-a806-4d14367a43b0'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6155742e-c89e-44d7-91c7-492be6fa243f'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6155742e-c89e-44d7-91c7-492be6fa243f'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '59538def-8743-47b7-9ec6-41718ba66421'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8639cc95-0939-43bf-947b-667e5c5aebcc'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a14178ae-3b12-4252-9db2-7916aea7c188'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a14178ae-3b12-4252-9db2-7916aea7c188'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a14178ae-3b12-4252-9db2-7916aea7c188'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'b36730ba-387a-4ce0-93a9-dd4d84960f09'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8686b250-2926-43df-8678-e204d3d3a9df'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8686b250-2926-43df-8678-e204d3d3a9df'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8686b250-2926-43df-8678-e204d3d3a9df'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4fe7264b-6cf1-4957-a560-785159b50c30'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4fe7264b-6cf1-4957-a560-785159b50c30'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '4fe7264b-6cf1-4957-a560-785159b50c30'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25707142-b1b6-4699-829a-6acb685b29e7'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '25707142-b1b6-4699-829a-6acb685b29e7'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '33afdffc-0751-48ec-bbbb-e7c76ae4c786'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '33afdffc-0751-48ec-bbbb-e7c76ae4c786'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '33afdffc-0751-48ec-bbbb-e7c76ae4c786'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '6cf0c158-2361-4019-b58e-0a697db8f056'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '44f377a4-5490-4aca-9112-92fce03d5ff6'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1d558228-498d-4496-b3e1-78286c675e71'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '00a038b1-524d-480c-b634-a50593081c8c'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '12f9f8b5-4422-4151-8dcb-076529349277'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '12f9f8b5-4422-4151-8dcb-076529349277'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (s:Style {name: 'New School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (s:Style {name: 'Realism'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (s:Style {name: 'Old School'}) MERGE (a)-[:PRACTICES_STYLE]->(s);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:PRACTICES_STYLE]->(s);

// Create USES_COLOR relationships
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'da6e554a-27e5-493f-a31a-b579036e52bb'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'da6e554a-27e5-493f-a31a-b579036e52bb'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b21a3922-5c2c-4286-a7f3-c586ee2e927b'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5845f507-6538-4cd8-b271-eb8aa11c53cd'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3e9af287-58da-40bc-bb97-131be29803b1'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3e9af287-58da-40bc-bb97-131be29803b1'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1f88ee60-8728-472f-a0fa-9f54afbfda10'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e4bd1bff-e8d8-49e9-b491-574e7a76d155'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b86e99cc-5956-4f68-9fe3-1d7bb1a2ef0f'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b86e99cc-5956-4f68-9fe3-1d7bb1a2ef0f'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b86e99cc-5956-4f68-9fe3-1d7bb1a2ef0f'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1829395c-6eeb-4333-a3ca-ff3477f0ce59'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '387217c0-aec5-43b0-8d8a-357c08424317'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '24aa166e-43d9-4f88-904e-05c59bc689af'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '24aa166e-43d9-4f88-904e-05c59bc689af'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '24aa166e-43d9-4f88-904e-05c59bc689af'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '33485588-ed73-49a8-ad21-e279480614ab'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '33485588-ed73-49a8-ad21-e279480614ab'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '33485588-ed73-49a8-ad21-e279480614ab'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '30a4c0cb-bc9f-4794-8519-a2496d5076c5'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '61a2924d-df0c-45e6-a6df-89082cd04f15'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '61a2924d-df0c-45e6-a6df-89082cd04f15'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c29e6c49-17f9-4c9f-91bc-f4c95a7c8ab8'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0aafa0b8-cb74-4648-8746-12e2119ea4f2'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0aafa0b8-cb74-4648-8746-12e2119ea4f2'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'bc83de6f-08e0-4b37-8300-08b105622431'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cf54fb41-0aba-45ca-96ca-783b369b94d6'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac5c8489-28cd-42ce-8e18-3ff47c1c95b6'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac5c8489-28cd-42ce-8e18-3ff47c1c95b6'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac5c8489-28cd-42ce-8e18-3ff47c1c95b6'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cfe93205-8a1d-4d07-a493-859cc38cce8f'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '40a56e76-f6bc-488d-a3c6-434f39791e97'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5ff32a33-48d1-461c-bd6a-4bacde579c3d'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'de7471f0-eb08-430f-a039-d076773cc291'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8c9a497f-28b2-4463-80cd-a824de75309b'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8c9a497f-28b2-4463-80cd-a824de75309b'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '623141ca-9ee8-456b-8516-ed997dc40fdc'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'df1e9684-b150-4ad4-a806-4d14367a43b0'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6155742e-c89e-44d7-91c7-492be6fa243f'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '59538def-8743-47b7-9ec6-41718ba66421'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8639cc95-0939-43bf-947b-667e5c5aebcc'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8639cc95-0939-43bf-947b-667e5c5aebcc'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8639cc95-0939-43bf-947b-667e5c5aebcc'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a14178ae-3b12-4252-9db2-7916aea7c188'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a14178ae-3b12-4252-9db2-7916aea7c188'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'b36730ba-387a-4ce0-93a9-dd4d84960f09'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8686b250-2926-43df-8678-e204d3d3a9df'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '4fe7264b-6cf1-4957-a560-785159b50c30'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25707142-b1b6-4699-829a-6acb685b29e7'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25707142-b1b6-4699-829a-6acb685b29e7'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '25707142-b1b6-4699-829a-6acb685b29e7'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '33afdffc-0751-48ec-bbbb-e7c76ae4c786'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6cf0c158-2361-4019-b58e-0a697db8f056'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6cf0c158-2361-4019-b58e-0a697db8f056'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '6cf0c158-2361-4019-b58e-0a697db8f056'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '44f377a4-5490-4aca-9112-92fce03d5ff6'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1d558228-498d-4496-b3e1-78286c675e71'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1d558228-498d-4496-b3e1-78286c675e71'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (c:Color {name: 'Vibrant'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (c:Color {name: 'Monochrome'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '00a038b1-524d-480c-b634-a50593081c8c'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '00a038b1-524d-480c-b634-a50593081c8c'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '12f9f8b5-4422-4151-8dcb-076529349277'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (c:Color {name: 'Neon'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (c:Color {name: 'Bold Colors'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (c:Color {name: 'Pastel'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (c:Color {name: 'Earth Tones'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (c:Color {name: 'Black Only'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (c:Color {name: 'Black & Grey'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (c:Color {name: 'Full Color'}) MERGE (a)-[:USES_COLOR]->(c);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (c:Color {name: 'Muted'}) MERGE (a)-[:USES_COLOR]->(c);

// Create SPECIALIZES_IN relationships
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3bd06f61-bdf4-4147-9411-ec0fcff0cea4'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6026f7ac-5b01-4891-b47f-ae32f4ddf09b'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a9436f14-53f9-4056-953e-29f560dab5a9'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '92824bf4-f3b6-41c8-89bd-97eb1e600d1b'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '759e2449-2616-4d3a-a327-7e3bbd57083e'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '942d3fd3-2fad-4074-adc9-abb76e638665'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81d10875-d68a-4e58-aef7-b29e5f8e48ce'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '43ea7a24-622c-4402-8780-2acdcbe6d9cb'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ba5e7645-45d8-4acb-b1b4-cdbceb38a10a'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '018e0cac-4608-46ab-a3ad-474a9b9ab7de'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce1fe16c-7d7b-43fb-aa11-51c027f3152c'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e614a27f-bb8b-4bb8-8afa-cb4f74751eb7'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'da6e554a-27e5-493f-a31a-b579036e52bb'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b21a3922-5c2c-4286-a7f3-c586ee2e927b'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25ad22ab-c8db-439a-81b7-1e48b85314ba'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '80dd0ffe-7841-4a7b-9920-68c84e20409f'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '35908fd7-da81-4848-bac3-9c2a2b336b4b'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b72a8e3a-18b6-4311-a23f-e7ec5092e619'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '259dea08-04a7-4119-95ac-f5d2b3ba153d'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'aae32407-b25d-401e-8c80-aa744a523230'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd985253d-7364-4aea-9efb-ab094935b1d1'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '27346ff0-e86f-4c73-be87-d19d2691d7c7'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f6677d34-df32-444d-a4f9-07414f2ccb71'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '839b9086-cf3f-4b42-98c5-68dfb89655cb'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '20929771-d891-4b6a-944a-ae6ccf5fd67f'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9ccf2900-6eae-4e31-941a-537fd076b26e'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '543f2e52-b849-4819-a72e-670a0bb837b3'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0aa0d199-c0e9-461e-b98f-682dad5469ec'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05c1794a-a723-44c1-a5b6-4415c7bf2647'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd6a9930c-68ed-4f33-a8a5-7d44b441fe1e'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eb333b79-aec6-4da1-b88d-08665d05fd3a'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5845f507-6538-4cd8-b271-eb8aa11c53cd'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8354ec80-dfe5-454e-ae06-224f4550b263'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f091156c-5130-48b2-93ee-78ecdb2dc131'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3e9af287-58da-40bc-bb97-131be29803b1'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0cc00470-5afc-457d-825e-38cad7829982'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2a0c04ba-e135-4ff4-9a27-a20a2e68ce15'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e952f62a-2618-4286-92a5-dc01dd686041'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b11c8811-91d2-44b8-bf6d-2c0be4b127a6'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cd5c9e8b-5610-4487-a22c-b09459ea4c91'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'dc20c1aa-b217-4ecb-85e4-a13fa5f4f10b'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1f88ee60-8728-472f-a0fa-9f54afbfda10'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1f88ee60-8728-472f-a0fa-9f54afbfda10'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e4bd1bff-e8d8-49e9-b491-574e7a76d155'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'aeffaf5a-5e2e-455b-bfde-9ea0ab74fb87'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b86e99cc-5956-4f68-9fe3-1d7bb1a2ef0f'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8fe54b1-6a86-496f-b69d-71a357d8f92f'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '05668c66-56b9-460b-a950-a57552b65358'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53360081-cb1d-4b9e-ab1a-aeb1f647aa35'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ebf28709-0a85-4601-a684-6609c07dde60'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ce067719-0280-4116-8d74-76eb38094bd7'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e1331c41-8c4c-4059-ab26-837343e58cfb'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7b5085f9-dcc7-46a6-867a-1c2392f545d9'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '557b2eaf-3729-40b4-9b06-de327bad29e0'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25d0b38d-5e7c-435b-8cfc-e258cc2f634e'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '507bc2db-223c-4f1f-9989-d8f9d4d2fae7'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1829395c-6eeb-4333-a3ca-ff3477f0ce59'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1829395c-6eeb-4333-a3ca-ff3477f0ce59'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4db61d7c-ea3c-435e-8e80-3a5072d47b95'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '93aa7ff5-ad26-4e31-aa8b-5feebb29ffa9'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9c85952-2c2a-49bb-afcf-f5e5c5a0d3ae'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd71f64e5-762c-43ca-bc40-da66f6f69da3'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d8893ea-4f62-49ba-bb41-a187abf5e0c2'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eaf4182a-a3af-4fa9-b3b4-eb55c58bcc53'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b91c1d62-f7ec-42fa-a043-772be31be891'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '856208ab-49d0-4a3a-ac98-339eb6ce631f'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0d440b3f-4f9c-4a7d-bd1f-8103262c1cd2'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '114b0700-13ad-4a0f-86a3-2930b595ca2d'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '387217c0-aec5-43b0-8d8a-357c08424317'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '387217c0-aec5-43b0-8d8a-357c08424317'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a3b85462-dbd6-4539-b3e8-e9b725483c91'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c2fc072c-9dc0-4c90-9243-586c064a909f'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4d1fd05a-2bc3-4898-bba9-8af1d67c170b'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5aa37a69-bb5e-467f-b2fc-9b087bcf7ef2'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '24aa166e-43d9-4f88-904e-05c59bc689af'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '33485588-ed73-49a8-ad21-e279480614ab'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '33485588-ed73-49a8-ad21-e279480614ab'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b3925d7a-cc93-4cf3-af38-55d263055f2c'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0c133bba-7318-4405-ad52-0499289bfe38'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '30a4c0cb-bc9f-4794-8519-a2496d5076c5'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '30a4c0cb-bc9f-4794-8519-a2496d5076c5'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '61a2924d-df0c-45e6-a6df-89082cd04f15'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8aac5809-88eb-4010-9c1c-af99ca1fccbd'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ee5b329-70d4-41ec-900e-e7217adec545'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e128c511-54b7-4414-bdd3-1bc22f5637b4'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5cd6c2a8-7d49-4c9f-ac79-530581f4b7ab'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c29e6c49-17f9-4c9f-91bc-f4c95a7c8ab8'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '95849b42-47a5-4f59-85d2-eebf491ed3fb'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6cc9777f-78c4-4f6a-a901-93da54f614bf'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0aafa0b8-cb74-4648-8746-12e2119ea4f2'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e62d5ebb-3267-42c0-bfde-3a48fac0ac52'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e0412dd7-bdaa-49e2-ad97-4213cf6a68f9'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'bc83de6f-08e0-4b37-8300-08b105622431'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cf54fb41-0aba-45ca-96ca-783b369b94d6'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cf54fb41-0aba-45ca-96ca-783b369b94d6'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac27cae0-1716-4dc4-9eea-c5224ce38055'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed4e628e-7125-4186-870d-2f0190be9996'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c22be413-20c9-4fd2-b304-49baf076b5cf'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cfe811ef-c7c7-455f-a040-6652e36ef6f1'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '193ee80b-94c5-4588-99b6-5aa2f26a1822'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2bafc835-8784-4965-8d56-9b40bbca55e7'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac5c8489-28cd-42ce-8e18-3ff47c1c95b6'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '38de6885-8e7f-4b3c-952e-93e15bd0c404'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f9b3477c-d7a4-4191-8485-427b18cc565e'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a326e7ce-d265-48ab-878d-819b2edddb7b'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3b6fb1d8-f1fb-4fd3-80ee-d71463d6c868'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cfe93205-8a1d-4d07-a493-859cc38cce8f'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c01b1464-4235-42ca-9984-7e87212c5b67'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a24c194f-93d0-473b-96ec-fbe6d0e80228'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '583c03f9-30ef-465f-a7dc-3d36503aaf72'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f06b07b-b52e-45f9-9ec1-e509b6a15fed'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2f30b515-9c74-4cd7-90a5-23acd17607a9'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '40a56e76-f6bc-488d-a3c6-434f39791e97'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '40a56e76-f6bc-488d-a3c6-434f39791e97'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '40a56e76-f6bc-488d-a3c6-434f39791e97'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ff32a33-48d1-461c-bd6a-4bacde579c3d'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5ff32a33-48d1-461c-bd6a-4bacde579c3d'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f2ce2c6b-8e12-431e-ae78-321ddf5021a0'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9736890-e56c-4e9f-82a5-5ec4efc0b2e1'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e5cc5199-78c9-4271-8a9e-fc36cddc3a2c'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a836ba3e-912a-46b9-8537-ee260ad3ebbf'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd12ece4e-2895-47a0-a999-b81e8e57f998'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'de7471f0-eb08-430f-a039-d076773cc291'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'de7471f0-eb08-430f-a039-d076773cc291'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8c9a497f-28b2-4463-80cd-a824de75309b'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '866f2c37-2a5d-4d0e-bf47-28999f9f40a0'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '36dfaf4b-be9b-4b2d-8a5b-2aa93d26c1cf'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '623141ca-9ee8-456b-8516-ed997dc40fdc'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '623141ca-9ee8-456b-8516-ed997dc40fdc'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '623141ca-9ee8-456b-8516-ed997dc40fdc'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '623141ca-9ee8-456b-8516-ed997dc40fdc'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '819a9310-fad3-4062-8534-057c17f90d84'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'bd49022d-a395-4a7a-87bd-5bb80576e281'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6db44ecb-2cda-4eb9-bdf4-989a7a1b8797'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '47a1f895-3ac0-41f2-832e-765193815ad3'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c3fbb1f1-e91e-445f-8a65-ae495d28e9fe'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '50aa5ba5-2609-46a8-8315-127504a6b0ab'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'df1e9684-b150-4ad4-a806-4d14367a43b0'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'df1e9684-b150-4ad4-a806-4d14367a43b0'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b23f0fde-0147-4416-91f0-90e5491929d3'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '842bb415-dcde-4020-8769-2d33424abac5'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6155742e-c89e-44d7-91c7-492be6fa243f'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '388b2f3d-0088-450d-9583-4c46a837a962'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'fdb75be5-0260-49e3-bee8-3c6b94db952a'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e7b6fae-c843-4648-be4c-265b5450594c'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '59538def-8743-47b7-9ec6-41718ba66421'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '59538def-8743-47b7-9ec6-41718ba66421'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6541ecd-7add-4e4c-81c0-8e69bf5af624'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd3b49103-479a-4e29-a2d1-effeff3bb086'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6d9b7fdd-4d80-4bf2-a5e2-3a62047db9e2'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ac1c4917-5ee7-40fa-9ba9-222367462b92'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'cb40be59-7cd8-41a6-83d9-e474253e92b5'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '340c8da6-de8b-4be9-873b-1ea579afd71d'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd29570b4-4fe0-4dea-b9fb-c1045054d39a'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8639cc95-0939-43bf-947b-667e5c5aebcc'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a14178ae-3b12-4252-9db2-7916aea7c188'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'eebc3fe2-3fa3-43cc-973c-9955ff9d4ab3'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e9e439d5-459f-4230-8c1c-e0890b90cb35'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '7f3124b1-2895-4109-9532-44319dd7e6dc'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd6c31b01-a477-440d-830c-298d3e8e46df'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'c70bd1c9-0d33-45e9-937a-aec4eee8d832'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2b8e6136-e0c0-4b39-974d-566d3d6cf123'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '53ba4bdb-c4a1-4a21-b4b7-ac7939e8ed65'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '9e0f33c7-f8e2-4dcc-82ae-d5dbe42aad00'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8987dcec-e4c4-4a0c-9fe2-4cb4dfe9c692'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a87cce35-b813-47ca-9323-99b4392f8337'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3a6002ff-712a-441e-a483-e2b81e3294ef'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1c837b81-33cb-48d6-bf1f-786973a2c500'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f54b3c8-c2d3-4414-9c5a-63f3943ffb95'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '873cc4c0-d115-4725-8746-1539f86ef19a'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0e032094-22d1-44a0-9d5a-c8fd63c4515a'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f122d140-03a0-451e-93e4-c2cb23683c75'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6c331293-5e07-4bca-a7f6-76835d8b598a'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '2dc45f68-d209-4674-bdf7-fac60eac77be'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '41fb2502-0534-4c3e-a9cf-6eab81351e02'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd547a2c5-cdcd-46e8-8605-4b1ea1e09a1e'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '48a0c6d9-3bef-4d40-a654-7fd229191d89'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'b36730ba-387a-4ce0-93a9-dd4d84960f09'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a2435552-8403-4d90-98fa-391502aa7e1a'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8686b250-2926-43df-8678-e204d3d3a9df'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4fe7264b-6cf1-4957-a560-785159b50c30'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '4fe7264b-6cf1-4957-a560-785159b50c30'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '5eda1c3d-7486-4438-9056-8814e7ce65b6'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '98c6c5d4-12cd-4434-b875-77ea66c46342'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'bae3c29b-cba3-457d-a2df-b53e8198d5bc'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '427e1174-bc2a-4dd0-8e20-e34f35de4283'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '25707142-b1b6-4699-829a-6acb685b29e7'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'daabc26e-bb55-447d-8356-0f7a833b6104'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd2d11c0d-2487-4c30-bc6b-506392a6a98e'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '37174f32-5038-46c0-92ef-4629ca6234d8'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '33afdffc-0751-48ec-bbbb-e7c76ae4c786'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '81fbbf5c-35da-4952-b02a-c8e0e9791c8a'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '064d66cc-5d95-46ee-9139-403c71fdd16e'}), (sp:Specialization {name: 'Small Delicate'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6bfb7fc8-b187-4484-998d-6031b10f6371'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8c74b725-b915-4b40-925c-45d3ca1e5dcb'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '117b8dbf-19bd-4fa1-b1f4-57e0bcaee126'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '62e09fb8-95db-47c9-9752-a2e6814cd910'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '696209f0-58d1-45b5-95c3-d8e59b7c5d35'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6cf0c158-2361-4019-b58e-0a697db8f056'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '6cf0c158-2361-4019-b58e-0a697db8f056'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '44f377a4-5490-4aca-9112-92fce03d5ff6'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '44f377a4-5490-4aca-9112-92fce03d5ff6'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '44f377a4-5490-4aca-9112-92fce03d5ff6'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '44f377a4-5490-4aca-9112-92fce03d5ff6'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1d558228-498d-4496-b3e1-78286c675e71'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1d558228-498d-4496-b3e1-78286c675e71'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'e8724aea-dbd3-4a9c-aafa-408ff8cac6de'}), (sp:Specialization {name: 'Large Scale'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a10c47be-07d7-4795-9079-807a494a6258'}), (sp:Specialization {name: 'Horror'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '8ed7958a-b935-47f7-a6bc-4ab319f662a4'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'a6fe90d3-5f30-4541-bb8e-9f7e005f3a49'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '00a038b1-524d-480c-b634-a50593081c8c'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '00a038b1-524d-480c-b634-a50593081c8c'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (sp:Specialization {name: 'Fantasy'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd7319521-ca55-4c66-937b-28d4307b32d7'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (sp:Specialization {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'ed7eba39-c91d-445e-a98e-7259bdb6eacb'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (sp:Specialization {name: 'Religious'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'df5edcdc-2cf0-44ed-9c36-ba2459054f2d'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (sp:Specialization {name: 'Cultural'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0f5b18ee-ff0a-48f4-93fa-cb47ab9ad27b'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '12f9f8b5-4422-4151-8dcb-076529349277'}), (sp:Specialization {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '12f9f8b5-4422-4151-8dcb-076529349277'}), (sp:Specialization {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (sp:Specialization {name: 'Medical Cover-up'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'd9550683-6866-4dec-a927-c82ba207eac4'}), (sp:Specialization {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (sp:Specialization {name: 'Mandala'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (sp:Specialization {name: 'Nature'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '3e13af16-5597-4b2e-bea7-1c59f3c53730'}), (sp:Specialization {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: 'f567514d-2e0f-4588-9960-4bc04fa0d423'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (sp:Specialization {name: 'Floral'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '0df583e5-8422-4995-84c3-6b0d33ce732f'}), (sp:Specialization {name: 'Cover-ups'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (sp:Specialization {name: 'Animal'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (sp:Specialization {name: 'Portraits'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (sp:Specialization {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);
MATCH (a:Artist {id: '1bd804dc-7da1-405d-8da9-61257ae42e27'}), (sp:Specialization {name: 'Memorial'}) MERGE (a)-[:SPECIALIZES_IN]->(sp);

// Verification queries
MATCH (a:Artist) RETURN count(a) as artistCount;
MATCH (s:Style) RETURN count(s) as styleCount;
MATCH (c:Color) RETURN count(c) as colorCount;
MATCH (sp:Specialization) RETURN count(sp) as specializationCount;
MATCH (l:Location) RETURN count(l) as locationCount;
MATCH (a:Artist)-[r:PRACTICES_STYLE]->(s:Style) RETURN count(r) as practicesStyleCount;
MATCH (a:Artist)-[r:USES_COLOR]->(c:Color) RETURN count(r) as usesColorCount;
MATCH (a:Artist)-[r:SPECIALIZES_IN]->(sp:Specialization) RETURN count(r) as specializesInCount;
MATCH (a:Artist)-[r:LOCATED_IN]->(l:Location) RETURN count(r) as locatedInCount;