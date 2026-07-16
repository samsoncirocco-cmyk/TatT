// Neo4j Import Script for Tattoo Artists
// Generated from Supabase-compatible dataset (canonical graph model)

// Clear existing data (optional - remove if you want to merge)
MATCH (n) DETACH DELETE n;

// Create indexes
CREATE INDEX artist_id_index IF NOT EXISTS FOR (a:Artist) ON (a.id);
CREATE INDEX artist_name_index IF NOT EXISTS FOR (a:Artist) ON (a.name);
CREATE INDEX state_name_index IF NOT EXISTS FOR (st:State) ON (st.name);
CREATE INDEX city_name_index IF NOT EXISTS FOR (c:City) ON (c.name);
CREATE INDEX shop_name_index IF NOT EXISTS FOR (sh:Shop) ON (sh.name);
CREATE INDEX style_name_index IF NOT EXISTS FOR (s:Style) ON (s.name);
CREATE INDEX website_url_index IF NOT EXISTS FOR (w:Website) ON (w.url);

// Create State nodes
MERGE (st:State {name: 'Texas'});
MERGE (st:State {name: 'Colorado'});
MERGE (st:State {name: 'Quebec'});
MERGE (st:State {name: 'New Jersey'});
MERGE (st:State {name: 'Florida'});
MERGE (st:State {name: 'Oregon'});
MERGE (st:State {name: 'New York'});
MERGE (st:State {name: 'California'});
MERGE (st:State {name: 'Arizona'});
MERGE (st:State {name: 'Vermont'});
MERGE (st:State {name: 'New South Wales'});
MERGE (st:State {name: 'Victoria'});
MERGE (st:State {name: 'Ontario'});
MERGE (st:State {name: 'Western Australia'});
MERGE (st:State {name: 'British Columbia'});

// Create City nodes
MERGE (c:City {name: 'Austin', state: 'Texas'});
MERGE (c:City {name: 'Denver', state: 'Colorado'});
MERGE (c:City {name: 'Montreal', state: 'Quebec'});
MERGE (c:City {name: 'Newark', state: 'New Jersey'});
MERGE (c:City {name: 'Tampa', state: 'Florida'});
MERGE (c:City {name: 'Portland', state: 'Oregon'});
MERGE (c:City {name: 'Houston', state: 'Texas'});
MERGE (c:City {name: 'Ewing Township', state: 'New Jersey'});
MERGE (c:City {name: 'Brooklyn', state: 'New York'});
MERGE (c:City {name: 'San Diego', state: 'California'});
MERGE (c:City {name: 'Tucson', state: 'Arizona'});
MERGE (c:City {name: 'Manhattan', state: 'New York'});
MERGE (c:City {name: 'Dallas', state: 'Texas'});
MERGE (c:City {name: 'Burlington', state: 'Vermont'});
MERGE (c:City {name: 'Sydney', state: 'New South Wales'});
MERGE (c:City {name: 'Miami', state: 'Florida'});
MERGE (c:City {name: 'Jersey City', state: 'New Jersey'});
MERGE (c:City {name: 'Melbourne', state: 'Victoria'});
MERGE (c:City {name: 'Toronto', state: 'Ontario'});
MERGE (c:City {name: 'Perth', state: 'Western Australia'});
MERGE (c:City {name: 'Phoenix', state: 'Arizona'});
MERGE (c:City {name: 'Vancouver', state: 'British Columbia'});
MERGE (c:City {name: 'Los Angeles', state: 'California'});
MERGE (c:City {name: 'San Francisco', state: 'California'});

// Create Shop nodes
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Newark', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tampa', state: 'Florida'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Brooklyn', state: 'New York'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Ewing Township', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Tampa', state: 'Florida'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Newark', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Melbourne', state: 'Victoria'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Phoenix', state: 'Arizona'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Vancouver', state: 'British Columbia'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Newark', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Burlington', state: 'Vermont'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Melbourne', state: 'Victoria'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Perth', state: 'Western Australia'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Vancouver', state: 'British Columbia'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Vancouver', state: 'British Columbia'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Brooklyn', state: 'New York'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Portland', state: 'Oregon'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Newark', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Tampa', state: 'Florida'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Los Angeles', state: 'California'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Tampa', state: 'Florida'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Los Angeles', state: 'California'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Perth', state: 'Western Australia'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Phoenix', state: 'Arizona'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Portland', state: 'Oregon'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Perth', state: 'Western Australia'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Brooklyn', state: 'New York'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Houston', state: 'Texas'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Vancouver', state: 'British Columbia'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'San Francisco', state: 'California'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'San Francisco', state: 'California'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Burlington', state: 'Vermont'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Montreal', state: 'Quebec'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Ewing Township', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Melbourne', state: 'Victoria'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Dallas', state: 'Texas'});
MERGE (sh:Shop {name: 'Black Anchor Collective', city: 'Miami', state: 'Florida'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Burlington', state: 'Vermont'});
MERGE (sh:Shop {name: 'Electric Rose Parlor', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Tucson', state: 'Arizona'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Sydney', state: 'New South Wales'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Brooklyn', state: 'New York'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Raven & Rose Ink', city: 'Toronto', state: 'Ontario'});
MERGE (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Ink & Iron Studio', city: 'San Diego', state: 'California'});
MERGE (sh:Shop {name: 'Northern Lights Tattoo', city: 'Manhattan', state: 'New York'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'San Francisco', state: 'California'});
MERGE (sh:Shop {name: 'Sacred Art Collective', city: 'Newark', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Portland', state: 'Oregon'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Vancouver', state: 'British Columbia'});
MERGE (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'});
MERGE (sh:Shop {name: 'Wildflower Ink', city: 'Austin', state: 'Texas'});
MERGE (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Burlington', state: 'Vermont'});

// Create Style nodes
MERGE (s:Style {name: 'Fine Line'});
MERGE (s:Style {name: 'Japanese'});
MERGE (s:Style {name: 'Realism'});
MERGE (s:Style {name: 'Watercolor'});
MERGE (s:Style {name: 'Old School'});
MERGE (s:Style {name: 'Illustrative'});
MERGE (s:Style {name: 'Geometric'});
MERGE (s:Style {name: 'Minimalist'});
MERGE (s:Style {name: 'Dotwork'});
MERGE (s:Style {name: 'Traditional'});
MERGE (s:Style {name: 'Lettering'});
MERGE (s:Style {name: 'Surrealism'});
MERGE (s:Style {name: 'Blackwork'});
MERGE (s:Style {name: 'Tribal'});
MERGE (s:Style {name: 'Portrait'});
MERGE (s:Style {name: 'New School'});
MERGE (s:Style {name: 'Abstract'});
MERGE (s:Style {name: 'Neo-Traditional'});
MERGE (s:Style {name: 'Photo Realism'});
MERGE (s:Style {name: 'Biomechanical'});

// Create Website nodes
MERGE (w:Website {url: 'https://tatt.example.com/artists/02ec4ea7-b5ab-4d24-b392-91c639a33e2c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e1875c2c-10a3-4039-b377-03978aaaf373'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/27d4efd6-8f1a-4a40-8ab5-8a41d6b1fc06'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/80de89fd-be02-4b1e-ac16-46f1f39a0c91'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/6b1ec7db-c0fc-4fb1-a8ff-3077bb0af9f6'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/40813085-13b6-4a29-b879-f01f040a9939'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e03838cc-1a98-438a-8e06-2666a9eb254c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/df298d63-7296-4996-aae2-ffc6b08604a9'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/74a64337-b7a5-41fc-bb68-e1d70eb26de1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b7c2d56c-a819-4af8-9d64-7cd95195fe24'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/db05903d-9ce1-4cac-997e-74a7f2416c09'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/dfeead78-eb22-4fa6-9525-c3fd4a96691b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/825b7e04-23a3-4e8f-9f09-efb1917f5110'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/582b5060-279d-4995-9c17-fefd69cd4d78'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/57b00981-0e8d-4dac-8994-11934525e36f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/45d109a6-31da-4142-809e-ecc715deac1f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f3bfb91c-d8cf-4cff-8f29-64328eb90817'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/cd699690-83de-4c2e-af86-e2e83282aa74'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/d28d6312-d613-453a-8ecc-9b8570e58290'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/aa0f045a-7ba9-4bb2-9906-d15fdcce3f87'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/01d3bac0-42a3-4c93-a21e-ab7035644e58'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/ca3ba148-37cb-438c-83e1-194ea1460121'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/eabc1032-2b0e-4c55-88a8-94376675f5b5'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/01c1415e-279d-4505-b702-7a79bf9c4daf'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/cb7836ef-4a07-4681-a2f3-b5e6b9dbe0fb'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/a1de1fef-071e-4bed-a493-7466a2f7536e'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f2ee6f1c-ed20-4077-a0c9-485c07b01ea7'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e603bf28-89ce-45e6-b4f4-dc6bd294ebd8'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/efb44674-b3a1-413c-a264-a2b098cbe12d'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0d4b1025-61bd-47a8-9afc-4ec6078ad116'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/873ea4ff-f072-414d-b8df-2ff42238a937'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/bc73b9c9-97d9-425e-8744-e720c77a5e03'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f9d652ac-4a01-43b4-850c-95825322894c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0a28b513-2c11-457c-9c68-9e0ae3ef5660'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/166bd7f3-2003-4837-a9ce-d9e10ee90581'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f1a0b768-0472-443e-8a23-9473725f85b9'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b0171ad5-23ea-4255-ac2b-b8f57ba5755a'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/4bffb4db-abca-4353-959d-769162a2108b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9fdb55b9-09d7-4b91-93b1-16b0cb5d9131'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/cdfe7071-2ccb-47c2-81c3-5dd33a81155d'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0d202717-ec86-4522-93be-a317df75e43b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/ffab5f09-8dec-4eb5-94ab-05d05ce1b19c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/5dc40bc5-bb87-4962-878e-adfa856eb29a'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/89ae036f-c4f9-457e-8e06-c56a0932f4c7'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b99f3948-6226-48c6-8028-37e618993ac8'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/17055dd8-eac3-42ff-8d4b-5344f396a8d0'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/daf9d710-8413-49a6-8e1d-32bf0a168442'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/21c8ce76-3865-4b52-bc53-6e7f69e589f0'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1fea2547-2a89-47b1-ab05-8975debbb4d2'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/80486930-efc8-4fda-8929-243fba50bf32'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0aebd6ab-76d6-49d4-a6a9-a21db2ff101b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c7c0dd8c-2501-4c26-8683-4efa31d67dc3'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/7b01beca-822b-4d70-a36a-cb71f521558d'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f7750213-8481-4fae-a637-9b37f9d203a8'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/89b6748c-9d6a-49b0-820c-04c49d357a92'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/fedc8f0a-aab3-4875-9474-71bd5fce3a81'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/dc08cc84-4a59-48a1-aa74-9c5dd4207c7b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/7d0d6a41-84b1-4de4-86f9-9198b9948b47'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/12e293e3-d08c-4053-a1d4-17ba1d640cd2'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c8a212d2-3e9f-43de-87cb-c83e9c137184'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/8167c8af-370e-4440-8f32-cb7f10a73a40'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/dea89f6b-9d56-4250-b865-2220dc93e55b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1edbb126-1090-4b69-9ebd-f1f6064fdc44'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c686ad25-7d2b-4a9d-9c8b-b909112d67fe'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/30273995-8751-4031-879d-bd042197df09'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/bba06ada-0794-4ac1-9957-cd2aeaa3bcf4'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/7ba9a7b1-aa79-496a-8ef9-691fe6d32a03'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1702a915-e2d8-4a0e-baab-358a21c32243'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1c6ef356-585f-4cba-afee-dbecffa24c5e'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f0bac8f5-4ab3-4ff0-b3f6-d23e82b9259f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/a1746a2e-ab33-4aaa-8316-5b9521d1b51f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c05a8efc-216e-4dad-a8c4-f8c6ebb073c4'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f867bf09-1f37-493e-a6eb-c9900fb67be9'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e2927c19-3bc8-489f-90e2-e1db441fb3f8'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/87b101fa-70d7-4e08-a587-3f93bda1fc2c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/a4db8488-9bab-401d-9865-717f3eec405b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/527e872f-eb50-4032-87f9-8fbc319d35f8'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0e02fddd-9a6b-4e43-a9e1-5b552b9df443'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/51796989-7206-411a-8de1-e435f7ec5645'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b8193036-f2eb-493f-badb-c7aa6bd62557'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/12e8774b-56c9-45a0-8717-cc086c4f074c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1241a38a-a335-4298-a24f-9c5ea28c52ea'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/19898389-5351-4e8c-aae5-d0aba0a876bb'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/32b2bc5f-5bf9-4a83-8b44-def4b518dc16'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1e85273b-e2ca-4626-aa5a-a79f69d51e4a'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/d06d1a66-61c4-4c6a-8783-044f4942e389'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/631b64cc-f4b0-4703-9ab1-8200999c4e15'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/25322e36-4532-4377-a51d-eda2090bdc94'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/3d28083b-38c4-4ab1-84fa-03eb362b0b49'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f43bd8a4-e87c-40d3-87aa-928f14138df9'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/8b1547e9-f41a-439e-b360-a25361db81dd'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/58f516c7-63f1-42a4-9898-81da20be338c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f99194a9-4b09-4a60-9eee-b5459994a904'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/2821c6df-f1fa-4db3-84b0-1a8dad489cac'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e2e69714-2a4e-480c-adc4-ad809d91df91'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c2d5d3d7-4be1-4f39-84cc-d95732bb5e83'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/27a81df8-a503-48df-ab73-b8cb477ea768'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/868d428b-c166-46f0-b84f-a3a8c2d0b1c1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/a50af504-6a63-408d-9bad-74ad4962cf23'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/164c2abb-edd0-4113-8824-d5265664a054'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/d5b29c10-a0a3-4514-9e9b-786ccd3f65ff'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/985dae58-33c8-493e-a2a8-5f69bf56aae7'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9eda7756-9de2-4e66-a29f-049045a48f2b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0cde749e-41c9-4ef6-8461-416f5a41fcf4'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/da891e8d-aaf6-4f31-aa37-8459d0f3b7c6'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/27fcf78f-966e-4c5f-98e7-6270abaf15ec'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/695ac992-26c6-4294-b8bb-769799ae83ba'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/85944c04-a6d4-42b1-ae46-c5161092ea1c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/2227decc-aa11-4d51-836b-62c909163050'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/abddb203-989d-47df-b2af-40675117e7ba'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/667a9960-fba3-4e7c-8af2-1f743e38f80d'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/ab93473e-9c5b-46ac-ab3b-cea9395262b7'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/44ec0c78-504e-46af-bdfb-86ed59356088'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/12c8b512-e2c0-4ceb-a7bf-15700be85042'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/54a96639-0554-41c7-8960-b8c2e3c83ef5'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e2fac8ae-7ff9-47a6-8a0a-81de7df33895'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/00a4b0ca-6c76-43b4-9b2a-f5c70e068df6'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/a0cbb42b-e8b1-4c88-8f18-17940e114812'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9f42d080-9683-4db3-acf7-82ec80574137'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/3c2ac00b-e108-4a9c-97a8-3b981ed0a7cd'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/90a2cd84-b6c4-446f-962c-a0325707942c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/971003c5-5357-4de5-897e-822d12b249f0'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9879dab7-1558-4c5c-9dd7-244d655fa75c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e1a65f0c-be0a-43f0-b24b-dcf2a9f974bc'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/cec6c64a-468c-45eb-afed-3e8ff3e15c4e'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0f14220f-c32d-477b-8c1e-4b1ea5ea0cdf'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/61da5699-6d49-4f94-a3ae-46416658f110'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1ca2b168-ee11-46dc-be4d-90bac01ae025'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/da589d6e-aa23-4d66-93d3-55dfad15807c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1365a247-d8e9-4d5f-ba99-ea40d41eaac7'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/58f771ab-3585-4b39-b315-93462735fead'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0a9f6720-0262-4b5e-b66f-9812014046da'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f1fbfd69-cc2c-43ef-adc2-110382f208d8'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/16b95029-b95c-44d5-9df1-8b47dc018af9'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/dc8e9a11-40a7-4591-a6af-52dc4107c430'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/20166476-37a4-4dd7-9202-6c5fc7c9b08e'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/ce8173d1-e14e-4d6f-9cb3-52803c18f9c2'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/48eddb39-3fee-4096-a334-5b03b36eb252'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/80dca9eb-b033-4581-bfd7-c209771ca541'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e78fd9ce-2cdb-41d6-b0ec-c232d3fcad3c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/91cb3435-177b-4564-b66a-801550556b56'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/d167a7ba-6e57-4762-8160-3a1ce4a192f1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/93a422a6-450f-411a-a5fd-61ef185fa978'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/300295f7-6c15-4390-9571-16f5abc95406'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/2e2029ca-2b24-4c73-9792-d6ba824c28f4'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/71397102-522c-4894-9b50-41919acb12fb'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/ab019fb6-e5d7-40da-9d65-cd591c0d5ce1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c42b54ea-4716-4551-995e-fa1b6bcd7912'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/62cc7776-049a-4f86-968e-ad101dcffcc9'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/87ced077-1918-469f-b118-9e0f38f9c99e'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/a5e289d0-833d-45c9-90d8-7d5d32cd6201'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f7c375a2-7024-4f46-9b83-0840daf44459'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/75369ae7-5c09-42a4-83ea-a1c81a432af1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/aad8ded2-d01d-4b8e-a378-b0e41bd5e889'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e98eb0d8-4337-4baa-ae12-5bfa85c0b219'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/5ea5a8ee-0233-4af7-83f0-4e74201328a1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/ea3f0b0e-5d3d-4d47-a3d7-9ee9d7d827c5'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f174b88c-155f-4e71-9910-720e7fe33339'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/59d18bb3-eab9-4bad-aa87-c571325ea306'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/3f46c9f5-885b-4cb8-b1e4-2b7654206b81'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f5953d06-51eb-4e88-b86a-08a5d58d2c43'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c7f77e33-924e-4960-a6b9-7a1e0b0d83cc'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/457d61e8-007e-45bd-abaf-d035a9271607'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9e7a47e3-86f8-4aff-baa2-50d3638478e6'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/aa113bdf-a516-424f-aeea-15b4ac131491'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/10e25bd4-4ee4-4b4e-bdf4-7d62e57e8883'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/2cea32cc-caac-40a2-8679-7c5c7328abf3'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/cca11848-3d63-442a-8055-947949e39a2b'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1cc34038-da24-49f5-b781-95ba2b3972e5'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b0278e78-061f-4257-8ec9-f8950eab2497'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e67a1410-0ca6-4342-a5e3-6a31b5a785c5'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/99d2586e-08c4-4302-955f-246e7fcfdd2d'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9045c809-4eba-4233-81a1-7175804b8aba'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/934b8d79-4dc4-46af-b2e9-2032be8898da'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9a6f8382-33ca-43d8-b9c4-14cc140cbc5c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/87631753-e0dd-4d97-ba5f-b4404ac10425'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/365d0d16-3446-43a8-bc2e-2703dea78bb0'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/265bb8f2-e146-432c-99c5-c866bc0e2485'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/5f09911f-2e40-4223-82da-913c143a0d00'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/c9448b0f-e0b0-47e2-bb68-7c27e40792e1'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b0b69619-da71-4271-9ef9-ced7ec2c1c62'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/b6d8b52d-5d1e-46f5-a20c-0f58d716e79f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/9f1f9f32-c699-4c24-b693-b737147539ea'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f1a0e477-549a-431b-947c-0dfbcc618aca'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f23c0c71-2f55-4ec2-b889-4aca73c2f3ed'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1df00960-e3e9-4885-a5c0-9272adb6d60e'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/1216d0b3-e46f-45ea-8c9f-03d9cafc5f5d'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/77d49da9-1d3b-42a8-b526-02c1b0751da0'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e915aca8-e04c-4d57-be41-3e0922ed1012'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/0b6e430d-5094-439d-a6f8-58325b7a0d5f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/206c9fb1-35fa-4690-b52a-632c42c04b83'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/360d72d9-e52d-4ebb-b67c-d485fbb2cab4'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f1ef63d2-1b47-4a9f-8d61-f6098cce68f4'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/6ff8257a-ce95-4cfb-90c1-c11abb968a5c'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/878058d9-439c-4e59-adfe-b7441b632546'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/886dfcde-b319-4c11-bece-17d43d270649'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/d437cec3-d13e-4d42-939d-a33d4d6e335f'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/d4a3c029-bd91-43a4-abbd-7c07b9a82c21'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/e40cbb22-605d-4f19-9cd0-26a97cc73989'});
MERGE (w:Website {url: 'https://tatt.example.com/artists/f127017c-4e98-4315-b293-42d870bcb941'});

// Create Artist nodes with properties

// Batch 1
UNWIND [
  {id: '5835eaa6-f203-43b9-af47-485c58a2e52c', name: 'Sky Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/02ec4ea7-b5ab-4d24-b392-91c639a33e2c', is_curated: true, created_at: datetime('2026-04-10T20:54:30.116Z')},
  {id: '8e8045d7-4f3f-4e4e-8bd8-a93d8b478ca6', name: 'Ryder Blade', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e1875c2c-10a3-4039-b377-03978aaaf373', is_curated: false, created_at: datetime('2026-05-14T14:34:02.036Z')},
  {id: '6f3591de-bea3-4e00-8039-64981a8e099d', name: 'Zane Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/27d4efd6-8f1a-4a40-8ab5-8a41d6b1fc06', is_curated: false, created_at: datetime('2026-07-02T06:45:30.288Z')},
  {id: '095ab55f-df1b-45b9-be2e-d7305c7ebd23', name: 'Luna Cloud', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/80de89fd-be02-4b1e-ac16-46f1f39a0c91', is_curated: true, created_at: datetime('2026-05-13T21:27:30.281Z')},
  {id: 'c10e9891-b537-4baf-a0a2-d63e9edba3d1', name: 'Felix Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6b1ec7db-c0fc-4fb1-a8ff-3077bb0af9f6', is_curated: false, created_at: datetime('2025-12-08T14:36:03.345Z')},
  {id: 'c623ff67-bbf3-44e7-916c-550ec58ff314', name: 'Lyra Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/40813085-13b6-4a29-b879-f01f040a9939', is_curated: false, created_at: datetime('2026-01-25T08:04:07.909Z')},
  {id: '3557a401-d44d-430d-a755-cccdef2af361', name: 'Marcus Rivers', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e03838cc-1a98-438a-8e06-2666a9eb254c', is_curated: false, created_at: datetime('2025-10-30T01:09:46.720Z')},
  {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61', name: 'Lilith Hart', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/df298d63-7296-4996-aae2-ffc6b08604a9', is_curated: true, created_at: datetime('2026-01-09T00:36:59.919Z')},
  {id: 'db89ef64-3441-4646-a7c2-faa56526db5e', name: 'Knox Bold', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/74a64337-b7a5-41fc-bb68-e1d70eb26de1', is_curated: false, created_at: datetime('2025-07-18T22:21:06.855Z')},
  {id: '98c29f7a-256f-41b0-b416-3e3c57ace18c', name: 'Asher Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b7c2d56c-a819-4af8-9d64-7cd95195fe24', is_curated: true, created_at: datetime('2026-03-03T08:41:01.582Z')},
  {id: '40e41e2f-13df-4b25-ac45-b9db1f4b1275', name: 'Sky Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/db05903d-9ce1-4cac-997e-74a7f2416c09', is_curated: true, created_at: datetime('2025-09-24T16:48:51.850Z')},
  {id: 'ee555676-f8d8-4c34-a264-a08750fb9996', name: 'Ivy Anderson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/dfeead78-eb22-4fa6-9525-c3fd4a96691b', is_curated: false, created_at: datetime('2025-12-08T04:10:10.695Z')},
  {id: '7663cd0d-12e6-460f-9dec-78f1a8985d58', name: 'Orion Knight', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/825b7e04-23a3-4e8f-9f09-efb1917f5110', is_curated: false, created_at: datetime('2025-10-20T01:46:56.676Z')},
  {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd', name: 'Zara Black', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/582b5060-279d-4995-9c17-fefd69cd4d78', is_curated: false, created_at: datetime('2026-06-22T20:33:33.688Z')},
  {id: '6303c217-5dba-42d3-a9bc-ee609565cae9', name: 'Sky Flame', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/57b00981-0e8d-4dac-8994-11934525e36f', is_curated: true, created_at: datetime('2025-12-02T15:01:44.250Z')},
  {id: '9e31580e-c264-41de-989f-11751be0a56e', name: 'Lyra Wild', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/45d109a6-31da-4142-809e-ecc715deac1f', is_curated: false, created_at: datetime('2026-06-23T15:06:15.200Z')},
  {id: '3c57a451-d6c5-49ca-bf46-c94786215e54', name: 'Sky Black', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f3bfb91c-d8cf-4cff-8f29-64328eb90817', is_curated: false, created_at: datetime('2025-12-01T03:38:23.126Z')},
  {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776', name: 'Cruz Star', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cd699690-83de-4c2e-af86-e2e83282aa74', is_curated: true, created_at: datetime('2026-01-06T06:18:28.004Z')},
  {id: '1f3d84a1-292f-4836-86d3-cb0bf803193d', name: 'Seraphina Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d28d6312-d613-453a-8ecc-9b8570e58290', is_curated: false, created_at: datetime('2025-11-13T16:38:37.044Z')},
  {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe', name: 'Violet Bright', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/aa0f045a-7ba9-4bb2-9906-d15fdcce3f87', is_curated: false, created_at: datetime('2026-03-05T14:35:30.331Z')},
  {id: '366bda7c-009b-469c-a03f-6258fdc81bcd', name: 'Ivy Wild', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/01d3bac0-42a3-4c93-a21e-ab7035644e58', is_curated: false, created_at: datetime('2026-07-14T10:19:21.734Z')},
  {id: '19b09e4e-efcd-4863-bc43-a0cb266de01a', name: 'Phoenix Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ca3ba148-37cb-438c-83e1-194ea1460121', is_curated: true, created_at: datetime('2025-07-22T01:35:39.829Z')},
  {id: '79484512-840c-4529-93dc-de79d425043e', name: 'Cruz Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/eabc1032-2b0e-4c55-88a8-94376675f5b5', is_curated: true, created_at: datetime('2026-06-15T00:55:07.775Z')},
  {id: 'fe4eb917-6028-4878-b390-65ed795619b3', name: 'Sage Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/01c1415e-279d-4505-b702-7a79bf9c4daf', is_curated: false, created_at: datetime('2026-06-02T07:07:36.589Z')},
  {id: '77e6476e-db9a-4fce-bae7-123645e89d81', name: 'Kane Rivers', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cb7836ef-4a07-4681-a2f3-b5e6b9dbe0fb', is_curated: true, created_at: datetime('2026-06-27T11:43:56.494Z')},
  {id: '76bb3f0b-5533-43f4-8fee-7e36fe369ada', name: 'Blaze Fox', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a1de1fef-071e-4bed-a493-7466a2f7536e', is_curated: false, created_at: datetime('2025-12-31T17:52:07.437Z')},
  {id: '6bedcf48-0868-45f6-b021-329047a42b10', name: 'Aria Iron', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f2ee6f1c-ed20-4077-a0c9-485c07b01ea7', is_curated: true, created_at: datetime('2026-01-06T16:51:27.330Z')},
  {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c', name: 'Aurora Moon', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e603bf28-89ce-45e6-b4f4-dc6bd294ebd8', is_curated: false, created_at: datetime('2025-09-19T11:44:33.584Z')},
  {id: '3e2706ad-9e33-4d43-9338-c6992f074067', name: 'Drake Hart', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/efb44674-b3a1-413c-a264-a2b098cbe12d', is_curated: false, created_at: datetime('2025-12-23T08:02:20.954Z')},
  {id: 'b9d5e3be-5f5f-43de-85eb-20d27e7244ee', name: 'Zane Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0d4b1025-61bd-47a8-9afc-4ec6078ad116', is_curated: false, created_at: datetime('2026-02-21T20:47:12.503Z')},
  {id: '9801da5b-9906-4073-8df4-8bd1b58d327f', name: 'Orion Rivers', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/873ea4ff-f072-414d-b8df-2ff42238a937', is_curated: false, created_at: datetime('2026-05-04T10:07:05.317Z')},
  {id: '2a605cce-a668-4c76-8f31-839076c4db46', name: 'Ryder Reed', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/bc73b9c9-97d9-425e-8744-e720c77a5e03', is_curated: false, created_at: datetime('2025-11-13T23:55:29.798Z')},
  {id: '4e2c2df5-b4ed-4fb2-8052-7e3876b2268d', name: 'Luna Moon', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f9d652ac-4a01-43b4-850c-95825322894c', is_curated: true, created_at: datetime('2026-01-02T18:29:03.841Z')},
  {id: '6e763c3a-25fb-46ef-af92-355bfa7a48e3', name: 'Jaxon Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0a28b513-2c11-457c-9c68-9e0ae3ef5660', is_curated: false, created_at: datetime('2025-10-22T06:07:25.604Z')},
  {id: '985e2349-3b59-4cc8-a9ef-d33507d0f4bb', name: 'Lyra Knight', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/166bd7f3-2003-4837-a9ce-d9e10ee90581', is_curated: false, created_at: datetime('2026-07-08T17:07:38.048Z')},
  {id: 'd06b59c9-b214-4103-92df-34b79116142c', name: 'Jaxon Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f1a0b768-0472-443e-8a23-9473725f85b9', is_curated: false, created_at: datetime('2026-05-06T03:22:20.559Z')},
  {id: '15192239-10a2-4de0-a8e2-351cbdaf7f47', name: 'Zane Dark', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b0171ad5-23ea-4255-ac2b-b8f57ba5755a', is_curated: true, created_at: datetime('2026-05-30T08:57:26.679Z')},
  {id: 'a38f78ac-6d8c-4b3d-be7d-20e9317551db', name: 'Aurora Bright', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/4bffb4db-abca-4353-959d-769162a2108b', is_curated: false, created_at: datetime('2026-01-05T08:04:02.829Z')},
  {id: 'a1e331ce-411c-4f15-bd74-72fe0610957b', name: 'Kane Blade', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9fdb55b9-09d7-4b91-93b1-16b0cb5d9131', is_curated: false, created_at: datetime('2026-04-03T04:11:52.391Z')},
  {id: '9dd88c6f-e2e3-4530-af79-24a047e0146f', name: 'Aurora Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cdfe7071-2ccb-47c2-81c3-5dd33a81155d', is_curated: true, created_at: datetime('2025-10-16T19:03:43.848Z')},
  {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb', name: 'Aurora Silver', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0d202717-ec86-4522-93be-a317df75e43b', is_curated: false, created_at: datetime('2025-12-16T03:00:10.256Z')},
  {id: '6f26011c-bb1b-443a-9d87-3af8167cf938', name: 'Raven Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ffab5f09-8dec-4eb5-94ab-05d05ce1b19c', is_curated: true, created_at: datetime('2025-10-20T20:46:33.216Z')},
  {id: '86270e8f-d059-476a-b82f-9ac5e616e365', name: 'Aurora Bright', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/5dc40bc5-bb87-4962-878e-adfa856eb29a', is_curated: false, created_at: datetime('2025-12-18T02:59:26.444Z')},
  {id: '129fa57a-898f-460e-8352-88131f701f0e', name: 'Storm Sharp', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/89ae036f-c4f9-457e-8e06-c56a0932f4c7', is_curated: true, created_at: datetime('2026-05-01T21:31:56.706Z')},
  {id: '73d8f021-b367-4f3d-86b6-752ff6920b45', name: 'Blaze Blade', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b99f3948-6226-48c6-8028-37e618993ac8', is_curated: true, created_at: datetime('2026-03-21T07:16:36.512Z')},
  {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199', name: 'Felix Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/17055dd8-eac3-42ff-8d4b-5344f396a8d0', is_curated: true, created_at: datetime('2025-11-04T05:42:20.076Z')},
  {id: '0d7e41e5-abeb-4725-bded-8f1c44335b29', name: 'Lilith Sharp', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/daf9d710-8413-49a6-8e1d-32bf0a168442', is_curated: false, created_at: datetime('2026-03-28T13:52:20.901Z')},
  {id: '29be8331-46b2-441e-88ba-1bed9a611435', name: 'Kai Martinez', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/21c8ce76-3865-4b52-bc53-6e7f69e589f0', is_curated: false, created_at: datetime('2025-09-01T01:51:25.165Z')},
  {id: '5215b296-2512-48ad-a73a-7716ec0c18a5', name: 'Sky Martinez', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1fea2547-2a89-47b1-ab05-8975debbb4d2', is_curated: false, created_at: datetime('2026-03-22T12:56:23.518Z')},
  {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671', name: 'Dante Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/80486930-efc8-4fda-8929-243fba50bf32', is_curated: false, created_at: datetime('2025-09-04T03:53:05.679Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Batch 2
UNWIND [
  {id: '6e346c96-f77e-41b3-9304-c12cb9214cb5', name: 'Sky Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0aebd6ab-76d6-49d4-a6a9-a21db2ff101b', is_curated: true, created_at: datetime('2025-07-26T15:37:09.821Z')},
  {id: 'c6efd895-9169-402c-87f2-9a2087afd503', name: 'Luna Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c7c0dd8c-2501-4c26-8683-4efa31d67dc3', is_curated: false, created_at: datetime('2025-11-22T23:03:31.501Z')},
  {id: '0055ab2e-f215-499a-aaba-6b8694d85aaf', name: 'Lilith Knight', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7b01beca-822b-4d70-a36a-cb71f521558d', is_curated: false, created_at: datetime('2026-02-07T07:29:37.896Z')},
  {id: '29321bbb-7c48-4036-921b-330e2fe9814c', name: 'River Schwartz', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f7750213-8481-4fae-a637-9b37f9d203a8', is_curated: false, created_at: datetime('2026-06-14T16:56:59.550Z')},
  {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a', name: 'Sky Cloud', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/89b6748c-9d6a-49b0-820c-04c49d357a92', is_curated: false, created_at: datetime('2026-03-14T21:28:29.670Z')},
  {id: 'f6baf290-e80b-4ebb-88de-b8c225f12d71', name: 'Dante Knight', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/fedc8f0a-aab3-4875-9474-71bd5fce3a81', is_curated: true, created_at: datetime('2025-10-30T23:44:49.689Z')},
  {id: '82f14b6c-2aa8-4d66-ae6e-057131e9f322', name: 'Violet Sharp', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/dc08cc84-4a59-48a1-aa74-9c5dd4207c7b', is_curated: true, created_at: datetime('2025-08-14T23:27:25.807Z')},
  {id: 'b1c08501-25ca-4058-866b-e0129e8d9234', name: 'Kane Sharp', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7d0d6a41-84b1-4de4-86f9-9198b9948b47', is_curated: false, created_at: datetime('2026-06-22T12:36:08.579Z')},
  {id: '4135d823-5762-4c20-b6a0-0a3f4eb9a0bd', name: 'Jaxon Anderson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/12e293e3-d08c-4053-a1d4-17ba1d640cd2', is_curated: false, created_at: datetime('2026-04-21T04:25:10.590Z')},
  {id: '60352c84-b8fe-4378-ae2d-474b5c90360f', name: 'Jaxon Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c8a212d2-3e9f-43de-87cb-c83e9c137184', is_curated: false, created_at: datetime('2025-09-15T12:30:13.952Z')},
  {id: '3730e63d-6a38-4d1e-bca3-ff67ce0c82c7', name: 'Ember Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8167c8af-370e-4440-8f32-cb7f10a73a40', is_curated: true, created_at: datetime('2025-12-22T00:21:20.205Z')},
  {id: '7767ea76-b34d-4beb-beb8-29d51c4ac230', name: 'Blaze Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/dea89f6b-9d56-4250-b865-2220dc93e55b', is_curated: false, created_at: datetime('2026-03-19T10:03:22.931Z')},
  {id: 'c913f16b-0604-4f63-bbb7-ade8866b2c0d', name: 'Nova Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1edbb126-1090-4b69-9ebd-f1f6064fdc44', is_curated: false, created_at: datetime('2025-08-25T02:39:27.512Z')},
  {id: 'f1121635-0622-4078-9195-36eb0e4b02d3', name: 'Wolf Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c686ad25-7d2b-4a9d-9c8b-b909112d67fe', is_curated: false, created_at: datetime('2026-03-28T05:50:04.317Z')},
  {id: 'fa08bb8b-5f9e-4a40-b195-26b701d2794f', name: 'Zephyr Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/30273995-8751-4031-879d-bd042197df09', is_curated: false, created_at: datetime('2026-05-19T11:46:41.319Z')},
  {id: '41624bfe-ebb9-48cf-bcde-01490e2fffdc', name: 'Axel Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/bba06ada-0794-4ac1-9957-cd2aeaa3bcf4', is_curated: false, created_at: datetime('2026-01-29T07:06:19.341Z')},
  {id: 'dca7e8d3-fa07-4d4d-8e34-b433a6180727', name: 'Knox Iron', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/7ba9a7b1-aa79-496a-8ef9-691fe6d32a03', is_curated: false, created_at: datetime('2025-09-13T23:12:27.572Z')},
  {id: 'd6067ab0-40cd-4717-8c4e-d0b67a66f1d2', name: 'Cruz Blade', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1702a915-e2d8-4a0e-baab-358a21c32243', is_curated: false, created_at: datetime('2026-05-05T11:22:53.821Z')},
  {id: '1574381a-482d-42e0-b777-e00c9af45ea0', name: 'Orion Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1c6ef356-585f-4cba-afee-dbecffa24c5e', is_curated: true, created_at: datetime('2025-11-20T06:54:42.872Z')},
  {id: 'df0f254e-b58c-46ad-a541-b74dee3c05a8', name: 'Nova Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f0bac8f5-4ab3-4ff0-b3f6-d23e82b9259f', is_curated: false, created_at: datetime('2026-05-11T11:44:00.536Z')},
  {id: 'be689759-e106-4667-9d5a-ceebd5ed4aee', name: 'Orion Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a1746a2e-ab33-4aaa-8316-5b9521d1b51f', is_curated: true, created_at: datetime('2026-01-30T01:49:44.177Z')},
  {id: '3d03e544-fbe3-44ec-9f10-99b660316b18', name: 'Aria Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c05a8efc-216e-4dad-a8c4-f8c6ebb073c4', is_curated: false, created_at: datetime('2025-12-27T06:33:31.309Z')},
  {id: '07eaaeeb-1540-4670-b82d-b14e29dc1042', name: 'Amara Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f867bf09-1f37-493e-a6eb-c9900fb67be9', is_curated: true, created_at: datetime('2026-04-19T20:43:35.841Z')},
  {id: '02fb2183-6746-4782-9596-6c93810f137f', name: 'Lyra Cloud', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e2927c19-3bc8-489f-90e2-e1db441fb3f8', is_curated: false, created_at: datetime('2025-09-22T20:55:25.653Z')},
  {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98', name: 'Dante Martinez', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/87b101fa-70d7-4e08-a587-3f93bda1fc2c', is_curated: true, created_at: datetime('2025-07-25T13:18:40.946Z')},
  {id: 'a578a976-0c1d-483f-a614-f17bcacfaa18', name: 'Ember Silver', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a4db8488-9bab-401d-9865-717f3eec405b', is_curated: true, created_at: datetime('2026-04-19T16:43:38.646Z')},
  {id: '48b5c5cc-f48b-4eec-b7c3-a9bee19ca85e', name: 'Luna Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/527e872f-eb50-4032-87f9-8fbc319d35f8', is_curated: false, created_at: datetime('2025-08-12T14:51:36.791Z')},
  {id: '67035968-3e7f-43cd-a6cc-2a135688b3a9', name: 'Marcus Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0e02fddd-9a6b-4e43-a9e1-5b552b9df443', is_curated: true, created_at: datetime('2026-01-26T15:26:11.604Z')},
  {id: '5b691f1b-5ff9-4c39-a199-32b7b4613bbc', name: 'Wolf Wilson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/51796989-7206-411a-8de1-e435f7ec5645', is_curated: false, created_at: datetime('2026-05-12T13:16:18.213Z')},
  {id: '391e8d41-1d15-4d0e-a98f-51f4975fd182', name: 'Knox Knight', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b8193036-f2eb-493f-badb-c7aa6bd62557', is_curated: false, created_at: datetime('2025-09-09T11:22:34.824Z')},
  {id: '67f173fe-83d1-4b74-98ba-40321fadadef', name: 'Steel Light', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/12e8774b-56c9-45a0-8717-cc086c4f074c', is_curated: true, created_at: datetime('2025-08-18T18:15:08.284Z')},
  {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e', name: 'River Reed', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1241a38a-a335-4298-a24f-9c5ea28c52ea', is_curated: true, created_at: datetime('2025-12-28T10:07:26.844Z')},
  {id: 'd1b73eb1-da92-40a5-ab9c-0329957c95ea', name: 'Asher Reed', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/19898389-5351-4e8c-aae5-d0aba0a876bb', is_curated: true, created_at: datetime('2026-05-29T22:58:19.687Z')},
  {id: 'a3ff3e81-7682-4e54-833c-bce10f645131', name: 'Zara Bold', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/32b2bc5f-5bf9-4a83-8b44-def4b518dc16', is_curated: false, created_at: datetime('2025-07-24T19:47:53.550Z')},
  {id: 'dc65325e-bf12-4aea-966f-7b8576127878', name: 'Blaze Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1e85273b-e2ca-4626-aa5a-a79f69d51e4a', is_curated: true, created_at: datetime('2026-05-09T09:58:22.102Z')},
  {id: 'a239a071-a365-44f6-8c6e-8cd92d643c15', name: 'Ember Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d06d1a66-61c4-4c6a-8783-044f4942e389', is_curated: false, created_at: datetime('2026-06-09T07:03:58.473Z')},
  {id: '821e5518-b280-4007-8766-82e67d7cb3c4', name: 'Orion Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/631b64cc-f4b0-4703-9ab1-8200999c4e15', is_curated: false, created_at: datetime('2026-03-06T19:02:29.223Z')},
  {id: 'be121454-0452-4220-8608-421a04ddb03e', name: 'Phoenix Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/25322e36-4532-4377-a51d-eda2090bdc94', is_curated: false, created_at: datetime('2026-07-13T08:38:48.208Z')},
  {id: '9b1d83b0-9584-4721-babf-47722b212c4b', name: 'Miss Vampira Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3d28083b-38c4-4ab1-84fa-03eb362b0b49', is_curated: true, created_at: datetime('2026-02-17T19:05:37.365Z')},
  {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c', name: 'Steel Star', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f43bd8a4-e87c-40d3-87aa-928f14138df9', is_curated: false, created_at: datetime('2026-03-28T19:36:05.806Z')},
  {id: 'fc8cbd08-a294-40df-b95f-478801416b2c', name: 'River Fox', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/8b1547e9-f41a-439e-b360-a25361db81dd', is_curated: false, created_at: datetime('2025-11-25T03:05:09.417Z')},
  {id: 'bd7cf9f6-cfc2-4f5f-a91c-3c23ada0b2e0', name: 'Tyler Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/58f516c7-63f1-42a4-9898-81da20be338c', is_curated: false, created_at: datetime('2026-02-05T02:48:26.160Z')},
  {id: 'd93d6fe2-9bc4-40da-8e2e-97cdc4a90bad', name: 'Zephyr Anderson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f99194a9-4b09-4a60-9eee-b5459994a904', is_curated: false, created_at: datetime('2025-10-05T03:35:57.258Z')},
  {id: '87c1816e-28ff-48da-be7c-56fde3d2d452', name: 'Kane Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2821c6df-f1fa-4db3-84b0-1a8dad489cac', is_curated: false, created_at: datetime('2026-02-16T11:07:59.159Z')},
  {id: '33f924ba-843b-4f82-98d2-141c46bc31c3', name: 'Axel Anderson', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/e2e69714-2a4e-480c-adc4-ad809d91df91', is_curated: false, created_at: datetime('2026-05-13T17:51:07.248Z')},
  {id: '4ce8b98f-ca2d-4f65-97b6-de578c33315d', name: 'Jade Schwartz', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c2d5d3d7-4be1-4f39-84cc-d95732bb5e83', is_curated: true, created_at: datetime('2026-03-12T11:17:34.254Z')},
  {id: '3559c9a3-da74-4310-b318-2fd5e63597a8', name: 'Jade Star', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/27a81df8-a503-48df-ab73-b8cb477ea768', is_curated: false, created_at: datetime('2025-11-19T02:57:52.874Z')},
  {id: '040f96b0-e49a-4769-90a0-379551c5ee2d', name: 'Ivy Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/868d428b-c166-46f0-b84f-a3a8c2d0b1c1', is_curated: false, created_at: datetime('2026-01-07T06:10:11.646Z')},
  {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04', name: 'Seraphina Wild', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a50af504-6a63-408d-9bad-74ad4962cf23', is_curated: false, created_at: datetime('2026-05-22T16:56:41.037Z')},
  {id: 'e9272d93-2d2b-4e42-a752-a686a35ab2a8', name: 'Drake Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/164c2abb-edd0-4113-8824-d5265664a054', is_curated: false, created_at: datetime('2025-08-12T00:26:19.868Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Batch 3
UNWIND [
  {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa', name: 'Amara Wilson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d5b29c10-a0a3-4514-9e9b-786ccd3f65ff', is_curated: false, created_at: datetime('2026-02-26T00:16:57.709Z')},
  {id: '1476005b-7377-4e74-bf86-655d31be404d', name: 'Sky Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/985dae58-33c8-493e-a2a8-5f69bf56aae7', is_curated: true, created_at: datetime('2025-11-04T11:49:06.822Z')},
  {id: '92ec73d4-b380-46e9-8af2-065ae9055257', name: 'Lilith Light', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9eda7756-9de2-4e66-a29f-049045a48f2b', is_curated: true, created_at: datetime('2026-04-27T16:46:09.954Z')},
  {id: 'e5534c1c-980b-4691-b8cf-526599bbbdd0', name: 'Storm Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0cde749e-41c9-4ef6-8461-416f5a41fcf4', is_curated: false, created_at: datetime('2026-03-24T17:45:08.562Z')},
  {id: '236e6a8c-ebb6-4eaf-8686-158168e0ed58', name: 'Elena Rivers', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/da891e8d-aaf6-4f31-aa37-8459d0f3b7c6', is_curated: false, created_at: datetime('2026-03-03T07:04:00.868Z')},
  {id: '02455515-3b73-4a33-a236-e6c06a6bb9fd', name: 'Zara Phillips', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/27fcf78f-966e-4c5f-98e7-6270abaf15ec', is_curated: true, created_at: datetime('2025-07-30T15:20:07.307Z')},
  {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd', name: 'Steel Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/695ac992-26c6-4294-b8bb-769799ae83ba', is_curated: true, created_at: datetime('2025-08-09T11:52:19.609Z')},
  {id: 'dd814727-b29c-4dd8-909d-5ca6488c8eb5', name: 'Elena Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/85944c04-a6d4-42b1-ae46-c5161092ea1c', is_curated: true, created_at: datetime('2025-10-14T01:07:32.551Z')},
  {id: '6527611b-e793-43e4-8005-b72fd675347f', name: 'Zara Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2227decc-aa11-4d51-836b-62c909163050', is_curated: false, created_at: datetime('2025-07-17T22:07:03.294Z')},
  {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7', name: 'Amara Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/abddb203-989d-47df-b2af-40675117e7ba', is_curated: false, created_at: datetime('2025-09-23T01:58:34.115Z')},
  {id: 'c73bb7e7-b5e7-4534-b488-abbebe56e359', name: 'Jade Dark', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/667a9960-fba3-4e7c-8af2-1f743e38f80d', is_curated: true, created_at: datetime('2026-06-26T06:41:45.908Z')},
  {id: '51a32e86-838e-40ae-a9c4-cedcf8160fc7', name: 'Seraphina Silver', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ab93473e-9c5b-46ac-ab3b-cea9395262b7', is_curated: false, created_at: datetime('2026-02-08T06:35:00.198Z')},
  {id: '8d21659c-c8c7-4414-b2a2-847989a9533a', name: 'Nova Anderson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/44ec0c78-504e-46af-bdfb-86ed59356088', is_curated: true, created_at: datetime('2026-03-24T02:42:18.302Z')},
  {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f', name: 'Wolf Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/12c8b512-e2c0-4ceb-a7bf-15700be85042', is_curated: false, created_at: datetime('2025-09-14T14:06:13.075Z')},
  {id: '4f5960ef-eb70-4c80-86cb-cd54d652d129', name: 'Tyler Star', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/54a96639-0554-41c7-8960-b8c2e3c83ef5', is_curated: false, created_at: datetime('2025-10-03T13:35:45.042Z')},
  {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e', name: 'Nova Phillips', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e2fac8ae-7ff9-47a6-8a0a-81de7df33895', is_curated: true, created_at: datetime('2026-03-13T14:28:03.523Z')},
  {id: '08907aa8-4bb7-4e68-a3f1-054e65e96b64', name: 'Sky Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/00a4b0ca-6c76-43b4-9b2a-f5c70e068df6', is_curated: false, created_at: datetime('2025-12-28T08:56:46.118Z')},
  {id: '0862292a-4cb7-477c-88a8-01572b02edc1', name: 'Nova Rivers', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a0cbb42b-e8b1-4c88-8f18-17940e114812', is_curated: true, created_at: datetime('2026-06-18T19:33:19.759Z')},
  {id: 'b797fbad-4a03-4b15-8767-43efd16881f1', name: 'River Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9f42d080-9683-4db3-acf7-82ec80574137', is_curated: true, created_at: datetime('2026-06-17T02:50:58.674Z')},
  {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0', name: 'Steel Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3c2ac00b-e108-4a9c-97a8-3b981ed0a7cd', is_curated: false, created_at: datetime('2026-03-30T06:23:29.884Z')},
  {id: '69a4c31d-40d6-4991-8636-e1e6a57a8017', name: 'Lyra Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/90a2cd84-b6c4-446f-962c-a0325707942c', is_curated: false, created_at: datetime('2026-07-06T15:09:58.450Z')},
  {id: '82e31eb2-3d75-4877-a80c-7e86396c2738', name: 'River Wolfe', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/971003c5-5357-4de5-897e-822d12b249f0', is_curated: false, created_at: datetime('2025-07-27T22:38:52.616Z')},
  {id: 'ecc6d387-73ac-4e35-a323-e752ad5bd4c7', name: 'Lilith Knight', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9879dab7-1558-4c5c-9dd7-244d655fa75c', is_curated: false, created_at: datetime('2026-01-17T15:56:04.319Z')},
  {id: '0b1157a1-a3ad-4406-a0d2-0cbe3f66d08d', name: 'Wolf Light', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e1a65f0c-be0a-43f0-b24b-dcf2a9f974bc', is_curated: false, created_at: datetime('2025-12-17T02:53:38.811Z')},
  {id: '55a505f3-e689-4df4-b1bd-b9c90b63de9e', name: 'Amara Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cec6c64a-468c-45eb-afed-3e8ff3e15c4e', is_curated: true, created_at: datetime('2026-04-05T08:50:30.977Z')},
  {id: '5c8ce1cf-2505-4bce-b529-4a1a9bee3fa5', name: 'Sophia Schwartz', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0f14220f-c32d-477b-8c1e-4b1ea5ea0cdf', is_curated: true, created_at: datetime('2026-06-02T12:15:24.220Z')},
  {id: '7153ecff-8d28-4fc9-b208-004e909a6156', name: 'Zephyr Light', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/61da5699-6d49-4f94-a3ae-46416658f110', is_curated: false, created_at: datetime('2026-02-04T11:01:29.057Z')},
  {id: 'f885ac74-713c-43eb-9dbf-2f6096889fd3', name: 'Aurora Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1ca2b168-ee11-46dc-be4d-90bac01ae025', is_curated: true, created_at: datetime('2025-10-02T08:13:46.655Z')},
  {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35', name: 'Lyra Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/da589d6e-aa23-4d66-93d3-55dfad15807c', is_curated: true, created_at: datetime('2026-03-05T09:48:36.342Z')},
  {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c', name: 'River Cross', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1365a247-d8e9-4d5f-ba99-ea40d41eaac7', is_curated: false, created_at: datetime('2025-11-04T15:30:06.371Z')},
  {id: '8ff5f808-23e7-45b3-8cee-12c224568702', name: 'River Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/58f771ab-3585-4b39-b315-93462735fead', is_curated: true, created_at: datetime('2026-07-10T15:18:46.508Z')},
  {id: '24cac96d-848a-46b3-bf52-796ee3f35c94', name: 'Elena Moon', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0a9f6720-0262-4b5e-b66f-9812014046da', is_curated: true, created_at: datetime('2026-05-29T20:35:12.405Z')},
  {id: '52bc3f64-e3f6-44b2-a850-d7f71e7673a9', name: 'Axel Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f1fbfd69-cc2c-43ef-adc2-110382f208d8', is_curated: true, created_at: datetime('2026-01-12T18:04:59.566Z')},
  {id: '40f46778-2b70-49ea-a641-9515c6bf8135', name: 'Sky Iron', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/16b95029-b95c-44d5-9df1-8b47dc018af9', is_curated: true, created_at: datetime('2026-02-23T14:19:03.624Z')},
  {id: '7d95846f-e496-4420-8d67-830e2e5aea74', name: 'Ryder Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/dc8e9a11-40a7-4591-a6af-52dc4107c430', is_curated: true, created_at: datetime('2025-08-23T20:34:13.445Z')},
  {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70', name: 'Drake Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/20166476-37a4-4dd7-9202-6c5fc7c9b08e', is_curated: false, created_at: datetime('2026-04-23T18:19:39.947Z')},
  {id: '5e4cb69a-f376-410b-a630-a1024cb16bac', name: 'Orion Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ce8173d1-e14e-4d6f-9cb3-52803c18f9c2', is_curated: true, created_at: datetime('2025-08-03T09:24:40.840Z')},
  {id: '3852f0b4-2806-4de7-bca8-25aa3dbbe1a4', name: 'Zara Black', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/48eddb39-3fee-4096-a334-5b03b36eb252', is_curated: false, created_at: datetime('2026-02-20T05:19:09.206Z')},
  {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9', name: 'Miss Vampira Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/80dca9eb-b033-4581-bfd7-c209771ca541', is_curated: true, created_at: datetime('2026-04-28T11:17:50.817Z')},
  {id: '567fdf8c-ab6b-4928-8d9f-8ca3acadd4ef', name: 'Kane Light', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/e78fd9ce-2cdb-41d6-b0ec-c232d3fcad3c', is_curated: false, created_at: datetime('2026-02-01T04:05:18.098Z')},
  {id: 'cc678e75-6237-4283-b32b-f24ac53b94ad', name: 'Cruz Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/91cb3435-177b-4564-b66a-801550556b56', is_curated: true, created_at: datetime('2026-03-20T01:23:31.621Z')},
  {id: '3df464b3-b275-4f1f-950c-6844591a7348', name: 'Axel Hart', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d167a7ba-6e57-4762-8160-3a1ce4a192f1', is_curated: false, created_at: datetime('2025-11-10T21:44:31.265Z')},
  {id: '7c9c2ee6-6e3e-4bb7-857b-3df12bc96cc2', name: 'Sky Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/93a422a6-450f-411a-a5fd-61ef185fa978', is_curated: false, created_at: datetime('2026-02-01T16:34:54.296Z')},
  {id: '7b4512c1-82c5-444e-9718-6989ead08acc', name: 'Sky Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/300295f7-6c15-4390-9571-16f5abc95406', is_curated: true, created_at: datetime('2025-09-21T17:05:41.164Z')},
  {id: 'a8d6d6b0-6e69-4751-9c11-d44073011ce2', name: 'Blaze Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2e2029ca-2b24-4c73-9792-d6ba824c28f4', is_curated: true, created_at: datetime('2026-02-27T17:42:09.363Z')},
  {id: 'a1c01f96-d2a0-45e8-9d75-58f037fe05d4', name: 'Sage Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/71397102-522c-4894-9b50-41919acb12fb', is_curated: false, created_at: datetime('2025-10-14T18:57:36.776Z')},
  {id: '76ffe280-c21b-4096-aa17-e6608b81641c', name: 'Blaze Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ab019fb6-e5d7-40da-9d65-cd591c0d5ce1', is_curated: true, created_at: datetime('2026-04-23T13:32:38.997Z')},
  {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3', name: 'Violet Blade', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c42b54ea-4716-4551-995e-fa1b6bcd7912', is_curated: false, created_at: datetime('2025-12-14T05:32:18.210Z')},
  {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6', name: 'Sophia Flame', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/62cc7776-049a-4f86-968e-ad101dcffcc9', is_curated: false, created_at: datetime('2026-07-10T16:19:37.632Z')},
  {id: 'e2e295df-cd98-48f5-bf75-1ecd3a938b14', name: 'Ryder Sharp', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/87ced077-1918-469f-b118-9e0f38f9c99e', is_curated: false, created_at: datetime('2025-09-10T12:04:04.108Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Batch 4
UNWIND [
  {id: '866d79b4-882e-4610-908d-65f1abddce66', name: 'Elena Fox', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/a5e289d0-833d-45c9-90d8-7d5d32cd6201', is_curated: false, created_at: datetime('2025-08-25T07:14:06.189Z')},
  {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e', name: 'Raven Iron', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/f7c375a2-7024-4f46-9b83-0840daf44459', is_curated: false, created_at: datetime('2025-09-28T02:25:56.351Z')},
  {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31', name: 'Zane Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/75369ae7-5c09-42a4-83ea-a1c81a432af1', is_curated: false, created_at: datetime('2026-02-06T21:09:33.494Z')},
  {id: 'bd2cfcbb-faea-4215-92c8-c132bf8da238', name: 'Elena Dark', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/aad8ded2-d01d-4b8e-a378-b0e41bd5e889', is_curated: false, created_at: datetime('2026-02-05T12:57:31.622Z')},
  {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b', name: 'Felix Moon', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e98eb0d8-4337-4baa-ae12-5bfa85c0b219', is_curated: false, created_at: datetime('2025-12-25T15:45:24.400Z')},
  {id: '1d782048-86c4-44ad-b250-8d0e34d5561e', name: 'River Wild', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/5ea5a8ee-0233-4af7-83f0-4e74201328a1', is_curated: false, created_at: datetime('2026-06-09T19:41:41.839Z')},
  {id: '7528da8e-5e08-4cf5-bbfc-4162ba4c1e57', name: 'Orion Blade', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/ea3f0b0e-5d3d-4d47-a3d7-9ee9d7d827c5', is_curated: true, created_at: datetime('2026-07-04T16:19:11.360Z')},
  {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69', name: 'Willow Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f174b88c-155f-4e71-9910-720e7fe33339', is_curated: true, created_at: datetime('2026-01-21T16:02:59.072Z')},
  {id: 'e4bc3fa9-df8b-476f-b489-48228a714fa2', name: 'Sage Reed', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/59d18bb3-eab9-4bad-aa87-c571325ea306', is_curated: true, created_at: datetime('2026-04-24T03:42:31.814Z')},
  {id: '3e41b67a-36ca-4486-a6c0-8ed471a24a9f', name: 'Phoenix Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/3f46c9f5-885b-4cb8-b1e4-2b7654206b81', is_curated: false, created_at: datetime('2025-12-12T15:33:45.081Z')},
  {id: '1b9da0c9-ca52-43fb-8d45-446a80f3cf23', name: 'Sky Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f5953d06-51eb-4e88-b86a-08a5d58d2c43', is_curated: false, created_at: datetime('2026-04-21T20:50:04.665Z')},
  {id: '772bbc78-e611-45ed-b252-c62c89a58184', name: 'Asher Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c7f77e33-924e-4960-a6b9-7a1e0b0d83cc', is_curated: true, created_at: datetime('2026-03-16T01:32:32.158Z')},
  {id: 'a872ddeb-b14b-4205-88a7-2afd5774fff0', name: 'Zephyr Iron', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/457d61e8-007e-45bd-abaf-d035a9271607', is_curated: false, created_at: datetime('2025-08-17T15:03:48.254Z')},
  {id: '56087216-8a98-4df8-a16c-4dbf99c94e9c', name: 'Zephyr Storm', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9e7a47e3-86f8-4aff-baa2-50d3638478e6', is_curated: false, created_at: datetime('2026-06-11T04:19:57.514Z')},
  {id: '26aae468-b0d2-41f7-b6f6-7380dd67a60c', name: 'Zara Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/aa113bdf-a516-424f-aeea-15b4ac131491', is_curated: true, created_at: datetime('2025-12-11T14:56:00.900Z')},
  {id: '794a7f8b-1904-48a5-b407-4b85b6613ed3', name: 'Felix Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/10e25bd4-4ee4-4b4e-bdf4-7d62e57e8883', is_curated: false, created_at: datetime('2026-06-02T15:49:52.580Z')},
  {id: '1e61ba1e-046d-4044-9784-704d8cd4a725', name: 'Drake Iron', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/2cea32cc-caac-40a2-8679-7c5c7328abf3', is_curated: false, created_at: datetime('2026-02-05T18:42:03.428Z')},
  {id: 'a83936a8-f6fe-4615-9030-b0fdebfc81a0', name: 'Blair Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/cca11848-3d63-442a-8055-947949e39a2b', is_curated: true, created_at: datetime('2026-03-19T12:52:31.543Z')},
  {id: '0b5aae9e-7115-4be6-a571-c8328a1117e7', name: 'Cruz Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1cc34038-da24-49f5-b781-95ba2b3972e5', is_curated: false, created_at: datetime('2025-10-28T10:57:58.157Z')},
  {id: 'a3ab9151-1259-483c-887a-388948f01cf8', name: 'Sky Silver', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b0278e78-061f-4257-8ec9-f8950eab2497', is_curated: true, created_at: datetime('2025-08-04T08:35:01.477Z')},
  {id: '3edbc498-55b5-485d-81a7-2902da3f6893', name: 'Blair Fox', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e67a1410-0ca6-4342-a5e3-6a31b5a785c5', is_curated: false, created_at: datetime('2025-10-10T21:30:58.620Z')},
  {id: '5c63871c-c87f-40d6-8eff-7582ffecb7ed', name: 'Aria Bright', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/99d2586e-08c4-4302-955f-246e7fcfdd2d', is_curated: false, created_at: datetime('2025-08-31T10:58:34.453Z')},
  {id: '5ee83f4c-3812-422e-8969-e6f9d71d2d25', name: 'Zephyr Chen', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9045c809-4eba-4233-81a1-7175804b8aba', is_curated: true, created_at: datetime('2026-02-28T08:33:44.976Z')},
  {id: '85c8b8c3-91e1-4577-a4d6-36ba2338af44', name: 'Seraphina Rivers', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/934b8d79-4dc4-46af-b2e9-2032be8898da', is_curated: false, created_at: datetime('2026-05-27T13:08:59.847Z')},
  {id: 'c05fbe90-288a-4bc9-a099-b06f81ce2c92', name: 'Storm Bright', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9a6f8382-33ca-43d8-b9c4-14cc140cbc5c', is_curated: true, created_at: datetime('2026-06-21T00:40:47.613Z')},
  {id: 'a8984ae8-1699-4190-b367-6cd3134953d2', name: 'Wolf Schwartz', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/87631753-e0dd-4d97-ba5f-b4404ac10425', is_curated: false, created_at: datetime('2025-10-06T01:05:12.725Z')},
  {id: '3000a0b8-e841-4a45-a7af-cdbc1ac555fd', name: 'Zara Storm', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/365d0d16-3446-43a8-bc2e-2703dea78bb0', is_curated: true, created_at: datetime('2026-02-26T11:24:01.590Z')},
  {id: '546acb61-e7e5-43c0-9434-a53a0781c89a', name: 'Ember Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/265bb8f2-e146-432c-99c5-c866bc0e2485', is_curated: false, created_at: datetime('2026-03-17T01:00:51.829Z')},
  {id: 'e2741d5d-76fd-4aa9-80ce-c895a4bc5726', name: 'Asher Hart', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/5f09911f-2e40-4223-82da-913c143a0d00', is_curated: true, created_at: datetime('2026-02-20T17:25:37.937Z')},
  {id: 'ef41eded-9b52-4124-8575-a2018ed200db', name: 'Kane Young', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/c9448b0f-e0b0-47e2-bb68-7c27e40792e1', is_curated: true, created_at: datetime('2025-08-29T09:01:44.593Z')},
  {id: 'f57663d2-7d36-4407-ab69-4ce308865e70', name: 'Sophia Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b0b69619-da71-4271-9ef9-ced7ec2c1c62', is_curated: false, created_at: datetime('2025-09-04T13:27:47.530Z')},
  {id: '52cfc283-3d3f-478f-8e69-5497c0a21240', name: 'Dante Iron', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/b6d8b52d-5d1e-46f5-a20c-0f58d716e79f', is_curated: true, created_at: datetime('2026-04-19T11:37:43.080Z')},
  {id: '3890674b-a870-4abb-b32e-b7cc18548349', name: 'Nova Fox', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/9f1f9f32-c699-4c24-b693-b737147539ea', is_curated: false, created_at: datetime('2026-02-27T17:30:40.140Z')},
  {id: '7d1920ae-0df9-4727-b459-352346efd0bd', name: 'Knox Light', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f1a0e477-549a-431b-947c-0dfbcc618aca', is_curated: false, created_at: datetime('2026-02-23T12:27:16.417Z')},
  {id: 'ed91da3c-a198-45ad-97ed-b3160be1192d', name: 'Jade Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f23c0c71-2f55-4ec2-b889-4aca73c2f3ed', is_curated: true, created_at: datetime('2026-02-10T15:14:29.791Z')},
  {id: '97db48a6-0c51-4c89-88f7-4b941569e0a9', name: 'Orion Wolfe', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1df00960-e3e9-4885-a5c0-9272adb6d60e', is_curated: false, created_at: datetime('2025-07-29T06:28:33.850Z')},
  {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf', name: 'Aurora Silver', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/1216d0b3-e46f-45ea-8c9f-03d9cafc5f5d', is_curated: false, created_at: datetime('2026-04-11T21:38:22.819Z')},
  {id: '434098b1-bccd-49c8-b771-4683a861fcea', name: 'Aurora Reed', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/77d49da9-1d3b-42a8-b526-02c1b0751da0', is_curated: false, created_at: datetime('2026-01-27T16:49:16.462Z')},
  {id: '386bf3d6-f358-4738-9ddb-5079ebca7909', name: 'Asher Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e915aca8-e04c-4d57-be41-3e0922ed1012', is_curated: true, created_at: datetime('2025-09-02T08:17:53.295Z')},
  {id: 'fc8bcf0b-fb25-422f-877c-ac1c7a13d57d', name: 'Lilith Gray', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/0b6e430d-5094-439d-a6f8-58325b7a0d5f', is_curated: true, created_at: datetime('2026-05-01T08:49:22.275Z')},
  {id: '8df11dfe-b26b-4299-82c9-269c9b3ad476', name: 'Aurora Star', has_multiple_locations: true, profile_url: 'https://tatt.example.com/artists/206c9fb1-35fa-4690-b52a-632c42c04b83', is_curated: true, created_at: datetime('2025-10-21T16:33:10.556Z')},
  {id: '1e242c36-a916-4c94-ab2d-1265f74dd48b', name: 'Elena Martinez', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/360d72d9-e52d-4ebb-b67c-d485fbb2cab4', is_curated: false, created_at: datetime('2025-07-31T12:08:06.322Z')},
  {id: 'f56e08f5-7a4c-4b77-95f6-1cdebcf1938f', name: 'Wolf Star', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f1ef63d2-1b47-4a9f-8d61-f6098cce68f4', is_curated: true, created_at: datetime('2026-05-18T06:29:53.908Z')},
  {id: 'c8f53513-6e40-43f0-9d0f-81fe16302e20', name: 'Seraphina Stone', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/6ff8257a-ce95-4cfb-90c1-c11abb968a5c', is_curated: true, created_at: datetime('2025-08-28T02:25:49.281Z')},
  {id: '1371fabb-9b03-4bbe-810d-e9d9c92bbcd3', name: 'Violet Steele', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/878058d9-439c-4e59-adfe-b7441b632546', is_curated: false, created_at: datetime('2025-10-28T01:45:03.244Z')},
  {id: 'c30d7b12-4802-4ea3-8105-c4a45c013cea', name: 'Wolf Anderson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/886dfcde-b319-4c11-bece-17d43d270649', is_curated: false, created_at: datetime('2026-04-03T14:22:40.117Z')},
  {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738', name: 'Amara Wilson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d437cec3-d13e-4d42-939d-a33d4d6e335f', is_curated: false, created_at: datetime('2026-06-26T00:22:27.955Z')},
  {id: '2510c2ea-ff53-4f3e-9c28-b456e5384fa6', name: 'Phoenix Thorn', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/d4a3c029-bd91-43a4-abbd-7c07b9a82c21', is_curated: true, created_at: datetime('2026-06-13T14:01:58.796Z')},
  {id: 'd294198f-f290-4db6-904d-ee2ff4cf30a1', name: 'Orion Wilson', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/e40cbb22-605d-4f19-9cd0-26a97cc73989', is_curated: true, created_at: datetime('2026-06-06T08:15:05.825Z')},
  {id: '2c994788-0cd3-454a-b46b-5399baabff99', name: 'Blair Frost', has_multiple_locations: false, profile_url: 'https://tatt.example.com/artists/f127017c-4e98-4315-b293-42d870bcb941', is_curated: true, created_at: datetime('2026-06-17T13:28:36.971Z')}
] AS artist
MERGE (a:Artist {id: artist.id})
SET a.name = artist.name,
    a.has_multiple_locations = artist.has_multiple_locations,
    a.profile_url = artist.profile_url,
    a.is_curated = artist.is_curated,
    a.created_at = artist.created_at;

// Create HAS_CITY relationships (State -> City)
MATCH (st:State {name: 'Texas'}), (c:City {name: 'Austin', state: 'Texas'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Colorado'}), (c:City {name: 'Denver', state: 'Colorado'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Quebec'}), (c:City {name: 'Montreal', state: 'Quebec'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'New Jersey'}), (c:City {name: 'Newark', state: 'New Jersey'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Florida'}), (c:City {name: 'Tampa', state: 'Florida'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Oregon'}), (c:City {name: 'Portland', state: 'Oregon'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Texas'}), (c:City {name: 'Houston', state: 'Texas'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'New Jersey'}), (c:City {name: 'Ewing Township', state: 'New Jersey'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'New York'}), (c:City {name: 'Brooklyn', state: 'New York'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'California'}), (c:City {name: 'San Diego', state: 'California'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Arizona'}), (c:City {name: 'Tucson', state: 'Arizona'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'New York'}), (c:City {name: 'Manhattan', state: 'New York'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Texas'}), (c:City {name: 'Dallas', state: 'Texas'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Vermont'}), (c:City {name: 'Burlington', state: 'Vermont'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'New South Wales'}), (c:City {name: 'Sydney', state: 'New South Wales'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Florida'}), (c:City {name: 'Miami', state: 'Florida'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'New Jersey'}), (c:City {name: 'Jersey City', state: 'New Jersey'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Victoria'}), (c:City {name: 'Melbourne', state: 'Victoria'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Ontario'}), (c:City {name: 'Toronto', state: 'Ontario'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Western Australia'}), (c:City {name: 'Perth', state: 'Western Australia'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'Arizona'}), (c:City {name: 'Phoenix', state: 'Arizona'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'British Columbia'}), (c:City {name: 'Vancouver', state: 'British Columbia'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'California'}), (c:City {name: 'Los Angeles', state: 'California'}) MERGE (st)-[:HAS_CITY]->(c);
MATCH (st:State {name: 'California'}), (c:City {name: 'San Francisco', state: 'California'}) MERGE (st)-[:HAS_CITY]->(c);

// Create HAS_SHOP relationships (City -> Shop)
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Newark', state: 'New Jersey'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Newark', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tampa', state: 'Florida'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tampa', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Portland', state: 'Oregon'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Houston', state: 'Texas'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Ewing Township', state: 'New Jersey'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Brooklyn', state: 'New York'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Brooklyn', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Ewing Township', state: 'New Jersey'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Ewing Township', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Miami', state: 'Florida'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Melbourne', state: 'Victoria'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tampa', state: 'Florida'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Tampa', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Perth', state: 'Western Australia'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Houston', state: 'Texas'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Newark', state: 'New Jersey'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Newark', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Perth', state: 'Western Australia'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Melbourne', state: 'Victoria'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Melbourne', state: 'Victoria'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Phoenix', state: 'Arizona'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Phoenix', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Vancouver', state: 'British Columbia'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Vancouver', state: 'British Columbia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Los Angeles', state: 'California'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Newark', state: 'New Jersey'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Newark', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Melbourne', state: 'Victoria'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Melbourne', state: 'Victoria'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Perth', state: 'Western Australia'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Perth', state: 'Western Australia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Vancouver', state: 'British Columbia'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Vancouver', state: 'British Columbia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Houston', state: 'Texas'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Vancouver', state: 'British Columbia'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Vancouver', state: 'British Columbia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Brooklyn', state: 'New York'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Brooklyn', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Portland', state: 'Oregon'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Portland', state: 'Oregon'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Francisco', state: 'California'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Newark', state: 'New Jersey'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Newark', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tampa', state: 'Florida'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Tampa', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Los Angeles', state: 'California'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Los Angeles', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Francisco', state: 'California'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tampa', state: 'Florida'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Tampa', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Los Angeles', state: 'California'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Los Angeles', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Perth', state: 'Western Australia'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Perth', state: 'Western Australia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Phoenix', state: 'Arizona'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Phoenix', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tampa', state: 'Florida'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Miami', state: 'Florida'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Portland', state: 'Oregon'}), (sh:Shop {name: 'Wildflower Ink', city: 'Portland', state: 'Oregon'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Perth', state: 'Western Australia'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Perth', state: 'Western Australia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Phoenix', state: 'Arizona'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Brooklyn', state: 'New York'}), (sh:Shop {name: 'Wildflower Ink', city: 'Brooklyn', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Houston', state: 'Texas'}), (sh:Shop {name: 'Wildflower Ink', city: 'Houston', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Ewing Township', state: 'New Jersey'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Francisco', state: 'California'}), (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Vancouver', state: 'British Columbia'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Vancouver', state: 'British Columbia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Francisco', state: 'California'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'San Francisco', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Francisco', state: 'California'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'San Francisco', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Brooklyn', state: 'New York'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Newark', state: 'New Jersey'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Brooklyn', state: 'New York'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Phoenix', state: 'Arizona'}), (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Black Anchor Collective', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Phoenix', state: 'Arizona'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Sacred Art Collective', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Denver', state: 'Colorado'}), (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Los Angeles', state: 'California'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Houston', state: 'Texas'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Montreal', state: 'Quebec'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Montreal', state: 'Quebec'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Ewing Township', state: 'New Jersey'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Ewing Township', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Melbourne', state: 'Victoria'}), (sh:Shop {name: 'Wildflower Ink', city: 'Melbourne', state: 'Victoria'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Dallas', state: 'Texas'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Dallas', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Miami', state: 'Florida'}), (sh:Shop {name: 'Black Anchor Collective', city: 'Miami', state: 'Florida'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Ewing Township', state: 'New Jersey'}), (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Electric Rose Parlor', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Tucson', state: 'Arizona'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Tucson', state: 'Arizona'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Sydney', state: 'New South Wales'}), (sh:Shop {name: 'Wildflower Ink', city: 'Sydney', state: 'New South Wales'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Brooklyn', state: 'New York'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Brooklyn', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Melbourne', state: 'Victoria'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Toronto', state: 'Ontario'}), (sh:Shop {name: 'Raven & Rose Ink', city: 'Toronto', state: 'Ontario'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Jersey City', state: 'New Jersey'}), (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Diego', state: 'California'}), (sh:Shop {name: 'Ink & Iron Studio', city: 'San Diego', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Manhattan', state: 'New York'}), (sh:Shop {name: 'Northern Lights Tattoo', city: 'Manhattan', state: 'New York'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'San Francisco', state: 'California'}), (sh:Shop {name: 'Wildflower Ink', city: 'San Francisco', state: 'California'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Newark', state: 'New Jersey'}), (sh:Shop {name: 'Sacred Art Collective', city: 'Newark', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Portland', state: 'Oregon'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Portland', state: 'Oregon'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Vancouver', state: 'British Columbia'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Vancouver', state: 'British Columbia'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Ewing Township', state: 'New Jersey'}), (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Austin', state: 'Texas'}), (sh:Shop {name: 'Wildflower Ink', city: 'Austin', state: 'Texas'}) MERGE (c)-[:HAS_SHOP]->(sh);
MATCH (c:City {name: 'Burlington', state: 'Vermont'}), (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Burlington', state: 'Vermont'}) MERGE (c)-[:HAS_SHOP]->(sh);

// Create HAS_ARTIST relationships (Shop -> Artist)
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (a:Artist {id: '5835eaa6-f203-43b9-af47-485c58a2e52c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}), (a:Artist {id: '8e8045d7-4f3f-4e4e-8bd8-a93d8b478ca6'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '6f3591de-bea3-4e00-8039-64981a8e099d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: '095ab55f-df1b-45b9-be2e-d7305c7ebd23'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tampa', state: 'Florida'}), (a:Artist {id: 'c10e9891-b537-4baf-a0a2-d63e9edba3d1'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Austin', state: 'Texas'}), (a:Artist {id: 'c623ff67-bbf3-44e7-916c-550ec58ff314'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (a:Artist {id: '3557a401-d44d-430d-a755-cccdef2af361'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (a:Artist {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (a:Artist {id: 'db89ef64-3441-4646-a7c2-faa56526db5e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '98c29f7a-256f-41b0-b416-3e3c57ace18c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Brooklyn', state: 'New York'}), (a:Artist {id: '40e41e2f-13df-4b25-ac45-b9db1f4b1275'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'San Diego', state: 'California'}), (a:Artist {id: 'ee555676-f8d8-4c34-a264-a08750fb9996'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}), (a:Artist {id: '7663cd0d-12e6-460f-9dec-78f1a8985d58'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'}), (a:Artist {id: '6303c217-5dba-42d3-a9bc-ee609565cae9'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Dallas', state: 'Texas'}), (a:Artist {id: '9e31580e-c264-41de-989f-11751be0a56e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '3c57a451-d6c5-49ca-bf46-c94786215e54'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '1f3d84a1-292f-4836-86d3-cb0bf803193d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (a:Artist {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (a:Artist {id: '366bda7c-009b-469c-a03f-6258fdc81bcd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Dallas', state: 'Texas'}), (a:Artist {id: '19b09e4e-efcd-4863-bc43-a0cb266de01a'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'}), (a:Artist {id: '79484512-840c-4529-93dc-de79d425043e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: 'fe4eb917-6028-4878-b390-65ed795619b3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: '77e6476e-db9a-4fce-bae7-123645e89d81'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: '76bb3f0b-5533-43f4-8fee-7e36fe369ada'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tampa', state: 'Florida'}), (a:Artist {id: '6bedcf48-0868-45f6-b021-329047a42b10'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (a:Artist {id: '3e2706ad-9e33-4d43-9338-c6992f074067'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: 'b9d5e3be-5f5f-43de-85eb-20d27e7244ee'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: '9801da5b-9906-4073-8df4-8bd1b58d327f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'}), (a:Artist {id: '2a605cce-a668-4c76-8f31-839076c4db46'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (a:Artist {id: '4e2c2df5-b4ed-4fb2-8052-7e3876b2268d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '6e763c3a-25fb-46ef-af92-355bfa7a48e3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '985e2349-3b59-4cc8-a9ef-d33507d0f4bb'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Dallas', state: 'Texas'}), (a:Artist {id: 'd06b59c9-b214-4103-92df-34b79116142c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '15192239-10a2-4de0-a8e2-351cbdaf7f47'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Dallas', state: 'Texas'}), (a:Artist {id: 'a38f78ac-6d8c-4b3d-be7d-20e9317551db'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}), (a:Artist {id: 'a1e331ce-411c-4f15-bd74-72fe0610957b'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: '9dd88c6f-e2e3-4530-af79-24a047e0146f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: '6f26011c-bb1b-443a-9d87-3af8167cf938'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Phoenix', state: 'Arizona'}), (a:Artist {id: '86270e8f-d059-476a-b82f-9ac5e616e365'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: '129fa57a-898f-460e-8352-88131f701f0e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Vancouver', state: 'British Columbia'}), (a:Artist {id: '73d8f021-b367-4f3d-86b6-752ff6920b45'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'}), (a:Artist {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (a:Artist {id: '0d7e41e5-abeb-4725-bded-8f1c44335b29'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: '29be8331-46b2-441e-88ba-1bed9a611435'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '5215b296-2512-48ad-a73a-7716ec0c18a5'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '6e346c96-f77e-41b3-9304-c12cb9214cb5'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: 'c6efd895-9169-402c-87f2-9a2087afd503'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '0055ab2e-f215-499a-aaba-6b8694d85aaf'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: '29321bbb-7c48-4036-921b-330e2fe9814c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: 'f6baf290-e80b-4ebb-88de-b8c225f12d71'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Denver', state: 'Colorado'}), (a:Artist {id: '82f14b6c-2aa8-4d66-ae6e-057131e9f322'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: 'b1c08501-25ca-4058-866b-e0129e8d9234'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: '4135d823-5762-4c20-b6a0-0a3f4eb9a0bd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}), (a:Artist {id: '60352c84-b8fe-4378-ae2d-474b5c90360f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Dallas', state: 'Texas'}), (a:Artist {id: '3730e63d-6a38-4d1e-bca3-ff67ce0c82c7'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Vancouver', state: 'British Columbia'}), (a:Artist {id: '7767ea76-b34d-4beb-beb8-29d51c4ac230'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Denver', state: 'Colorado'}), (a:Artist {id: 'c913f16b-0604-4f63-bbb7-ade8866b2c0d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (a:Artist {id: 'f1121635-0622-4078-9195-36eb0e4b02d3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Vancouver', state: 'British Columbia'}), (a:Artist {id: 'fa08bb8b-5f9e-4a40-b195-26b701d2794f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: '41624bfe-ebb9-48cf-bcde-01490e2fffdc'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: 'dca7e8d3-fa07-4d4d-8e34-b433a6180727'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: 'd6067ab0-40cd-4717-8c4e-d0b67a66f1d2'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Brooklyn', state: 'New York'}), (a:Artist {id: '1574381a-482d-42e0-b777-e00c9af45ea0'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (a:Artist {id: 'df0f254e-b58c-46ad-a541-b74dee3c05a8'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Portland', state: 'Oregon'}), (a:Artist {id: 'be689759-e106-4667-9d5a-ceebd5ed4aee'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: '3d03e544-fbe3-44ec-9f10-99b660316b18'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'}), (a:Artist {id: '07eaaeeb-1540-4670-b82d-b14e29dc1042'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (a:Artist {id: '02fb2183-6746-4782-9596-6c93810f137f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'}), (a:Artist {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: 'a578a976-0c1d-483f-a614-f17bcacfaa18'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Dallas', state: 'Texas'}), (a:Artist {id: '48b5c5cc-f48b-4eec-b7c3-a9bee19ca85e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Tampa', state: 'Florida'}), (a:Artist {id: '67035968-3e7f-43cd-a6cc-2a135688b3a9'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '5b691f1b-5ff9-4c39-a199-32b7b4613bbc'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: '391e8d41-1d15-4d0e-a98f-51f4975fd182'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (a:Artist {id: '67f173fe-83d1-4b74-98ba-40321fadadef'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: 'd1b73eb1-da92-40a5-ab9c-0329957c95ea'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Denver', state: 'Colorado'}), (a:Artist {id: 'a3ff3e81-7682-4e54-833c-bce10f645131'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Los Angeles', state: 'California'}), (a:Artist {id: 'dc65325e-bf12-4aea-966f-7b8576127878'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: 'a239a071-a365-44f6-8c6e-8cd92d643c15'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '821e5518-b280-4007-8766-82e67d7cb3c4'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: 'be121454-0452-4220-8608-421a04ddb03e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (a:Artist {id: '9b1d83b0-9584-4721-babf-47722b212c4b'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (a:Artist {id: 'fc8cbd08-a294-40df-b95f-478801416b2c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Tampa', state: 'Florida'}), (a:Artist {id: 'bd7cf9f6-cfc2-4f5f-a91c-3c23ada0b2e0'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: 'd93d6fe2-9bc4-40da-8e2e-97cdc4a90bad'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: '87c1816e-28ff-48da-be7c-56fde3d2d452'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Los Angeles', state: 'California'}), (a:Artist {id: '33f924ba-843b-4f82-98d2-141c46bc31c3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '4ce8b98f-ca2d-4f65-97b6-de578c33315d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: '3559c9a3-da74-4310-b318-2fd5e63597a8'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Phoenix', state: 'Arizona'}), (a:Artist {id: '040f96b0-e49a-4769-90a0-379551c5ee2d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (a:Artist {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: 'e9272d93-2d2b-4e42-a752-a686a35ab2a8'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (a:Artist {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (a:Artist {id: '1476005b-7377-4e74-bf86-655d31be404d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: '92ec73d4-b380-46e9-8af2-065ae9055257'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Portland', state: 'Oregon'}), (a:Artist {id: 'e5534c1c-980b-4691-b8cf-526599bbbdd0'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: '236e6a8c-ebb6-4eaf-8686-158168e0ed58'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '02455515-3b73-4a33-a236-e6c06a6bb9fd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'}), (a:Artist {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: 'dd814727-b29c-4dd8-909d-5ca6488c8eb5'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Dallas', state: 'Texas'}), (a:Artist {id: '6527611b-e793-43e4-8005-b72fd675347f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'}), (a:Artist {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: 'c73bb7e7-b5e7-4534-b488-abbebe56e359'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Brooklyn', state: 'New York'}), (a:Artist {id: '51a32e86-838e-40ae-a9c4-cedcf8160fc7'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '8d21659c-c8c7-4414-b2a2-847989a9533a'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Houston', state: 'Texas'}), (a:Artist {id: '4f5960ef-eb70-4c80-86cb-cd54d652d129'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (a:Artist {id: '08907aa8-4bb7-4e68-a3f1-054e65e96b64'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '0862292a-4cb7-477c-88a8-01572b02edc1'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'San Diego', state: 'California'}), (a:Artist {id: 'b797fbad-4a03-4b15-8767-43efd16881f1'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'}), (a:Artist {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Vancouver', state: 'British Columbia'}), (a:Artist {id: '69a4c31d-40d6-4991-8636-e1e6a57a8017'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (a:Artist {id: '82e31eb2-3d75-4877-a80c-7e86396c2738'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: 'ecc6d387-73ac-4e35-a323-e752ad5bd4c7'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '0b1157a1-a3ad-4406-a0d2-0cbe3f66d08d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: '55a505f3-e689-4df4-b1bd-b9c90b63de9e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Francisco', state: 'California'}), (a:Artist {id: '5c8ce1cf-2505-4bce-b529-4a1a9bee3fa5'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '7153ecff-8d28-4fc9-b208-004e909a6156'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'San Francisco', state: 'California'}), (a:Artist {id: 'f885ac74-713c-43eb-9dbf-2f6096889fd3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'}), (a:Artist {id: '8ff5f808-23e7-45b3-8cee-12c224568702'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: '24cac96d-848a-46b3-bf52-796ee3f35c94'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '52bc3f64-e3f6-44b2-a850-d7f71e7673a9'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '40f46778-2b70-49ea-a641-9515c6bf8135'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'}), (a:Artist {id: '7d95846f-e496-4420-8d67-830e2e5aea74'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Austin', state: 'Texas'}), (a:Artist {id: '5e4cb69a-f376-410b-a630-a1024cb16bac'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (a:Artist {id: '3852f0b4-2806-4de7-bca8-25aa3dbbe1a4'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'}), (a:Artist {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Manhattan', state: 'New York'}), (a:Artist {id: '567fdf8c-ab6b-4928-8d9f-8ca3acadd4ef'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: 'cc678e75-6237-4283-b32b-f24ac53b94ad'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Diego', state: 'California'}), (a:Artist {id: '3df464b3-b275-4f1f-950c-6844591a7348'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'}), (a:Artist {id: '7c9c2ee6-6e3e-4bb7-857b-3df12bc96cc2'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (a:Artist {id: '7b4512c1-82c5-444e-9718-6989ead08acc'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'San Diego', state: 'California'}), (a:Artist {id: 'a8d6d6b0-6e69-4751-9c11-d44073011ce2'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (a:Artist {id: 'a1c01f96-d2a0-45e8-9d75-58f037fe05d4'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (a:Artist {id: '76ffe280-c21b-4096-aa17-e6608b81641c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (a:Artist {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'}), (a:Artist {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (a:Artist {id: 'e2e295df-cd98-48f5-bf75-1ecd3a938b14'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: '866d79b4-882e-4610-908d-65f1abddce66'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'}), (a:Artist {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Manhattan', state: 'New York'}), (a:Artist {id: 'bd2cfcbb-faea-4215-92c8-c132bf8da238'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Denver', state: 'Colorado'}), (a:Artist {id: '1d782048-86c4-44ad-b250-8d0e34d5561e'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}), (a:Artist {id: '7528da8e-5e08-4cf5-bbfc-4162ba4c1e57'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (a:Artist {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: 'e4bc3fa9-df8b-476f-b489-48228a714fa2'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '3e41b67a-36ca-4486-a6c0-8ed471a24a9f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: '1b9da0c9-ca52-43fb-8d45-446a80f3cf23'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (a:Artist {id: '772bbc78-e611-45ed-b252-c62c89a58184'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: 'a872ddeb-b14b-4205-88a7-2afd5774fff0'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Dallas', state: 'Texas'}), (a:Artist {id: '56087216-8a98-4df8-a16c-4dbf99c94e9c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Miami', state: 'Florida'}), (a:Artist {id: '26aae468-b0d2-41f7-b6f6-7380dd67a60c'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}), (a:Artist {id: '794a7f8b-1904-48a5-b407-4b85b6613ed3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: '1e61ba1e-046d-4044-9784-704d8cd4a725'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}), (a:Artist {id: 'a83936a8-f6fe-4615-9030-b0fdebfc81a0'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '0b5aae9e-7115-4be6-a571-c8328a1117e7'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: 'a3ab9151-1259-483c-887a-388948f01cf8'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '3edbc498-55b5-485d-81a7-2902da3f6893'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: '5c63871c-c87f-40d6-8eff-7582ffecb7ed'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: '5ee83f4c-3812-422e-8969-e6f9d71d2d25'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '85c8b8c3-91e1-4577-a4d6-36ba2338af44'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Diego', state: 'California'}), (a:Artist {id: 'c05fbe90-288a-4bc9-a099-b06f81ce2c92'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: 'a8984ae8-1699-4190-b367-6cd3134953d2'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}), (a:Artist {id: '3000a0b8-e841-4a45-a7af-cdbc1ac555fd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Sydney', state: 'New South Wales'}), (a:Artist {id: '546acb61-e7e5-43c0-9434-a53a0781c89a'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Brooklyn', state: 'New York'}), (a:Artist {id: 'e2741d5d-76fd-4aa9-80ce-c895a4bc5726'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: 'ef41eded-9b52-4124-8575-a2018ed200db'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Austin', state: 'Texas'}), (a:Artist {id: 'f57663d2-7d36-4407-ab69-4ce308865e70'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (a:Artist {id: '52cfc283-3d3f-478f-8e69-5497c0a21240'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Toronto', state: 'Ontario'}), (a:Artist {id: '3890674b-a870-4abb-b32e-b7cc18548349'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (a:Artist {id: '7d1920ae-0df9-4727-b459-352346efd0bd'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (a:Artist {id: 'ed91da3c-a198-45ad-97ed-b3160be1192d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: '97db48a6-0c51-4c89-88f7-4b941569e0a9'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'}), (a:Artist {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Manhattan', state: 'New York'}), (a:Artist {id: '434098b1-bccd-49c8-b771-4683a861fcea'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Diego', state: 'California'}), (a:Artist {id: '386bf3d6-f358-4738-9ddb-5079ebca7909'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}), (a:Artist {id: 'fc8bcf0b-fb25-422f-877c-ac1c7a13d57d'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Manhattan', state: 'New York'}), (a:Artist {id: '8df11dfe-b26b-4299-82c9-269c9b3ad476'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'San Francisco', state: 'California'}), (a:Artist {id: '1e242c36-a916-4c94-ab2d-1265f74dd48b'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Newark', state: 'New Jersey'}), (a:Artist {id: 'f56e08f5-7a4c-4b77-95f6-1cdebcf1938f'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: 'c8f53513-6e40-43f0-9d0f-81fe16302e20'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Portland', state: 'Oregon'}), (a:Artist {id: '1371fabb-9b03-4bbe-810d-e9d9c92bbcd3'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Vancouver', state: 'British Columbia'}), (a:Artist {id: 'c30d7b12-4802-4ea3-8105-c4a45c013cea'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (a:Artist {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Austin', state: 'Texas'}), (a:Artist {id: '2510c2ea-ff53-4f3e-9c28-b456e5384fa6'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Burlington', state: 'Vermont'}), (a:Artist {id: 'd294198f-f290-4db6-904d-ee2ff4cf30a1'}) MERGE (sh)-[:HAS_ARTIST]->(a);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (a:Artist {id: '2c994788-0cd3-454a-b46b-5399baabff99'}) MERGE (sh)-[:HAS_ARTIST]->(a);

// Create SPECIALIZES_IN relationships (Artist -> Style)
MATCH (a:Artist {id: '5835eaa6-f203-43b9-af47-485c58a2e52c'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5835eaa6-f203-43b9-af47-485c58a2e52c'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8e8045d7-4f3f-4e4e-8bd8-a93d8b478ca6'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8e8045d7-4f3f-4e4e-8bd8-a93d8b478ca6'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8e8045d7-4f3f-4e4e-8bd8-a93d8b478ca6'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6f3591de-bea3-4e00-8039-64981a8e099d'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6f3591de-bea3-4e00-8039-64981a8e099d'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '095ab55f-df1b-45b9-be2e-d7305c7ebd23'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '095ab55f-df1b-45b9-be2e-d7305c7ebd23'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c10e9891-b537-4baf-a0a2-d63e9edba3d1'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c10e9891-b537-4baf-a0a2-d63e9edba3d1'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c623ff67-bbf3-44e7-916c-550ec58ff314'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c623ff67-bbf3-44e7-916c-550ec58ff314'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c623ff67-bbf3-44e7-916c-550ec58ff314'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3557a401-d44d-430d-a755-cccdef2af361'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3557a401-d44d-430d-a755-cccdef2af361'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3557a401-d44d-430d-a755-cccdef2af361'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3557a401-d44d-430d-a755-cccdef2af361'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'db89ef64-3441-4646-a7c2-faa56526db5e'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'db89ef64-3441-4646-a7c2-faa56526db5e'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'db89ef64-3441-4646-a7c2-faa56526db5e'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '98c29f7a-256f-41b0-b416-3e3c57ace18c'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '98c29f7a-256f-41b0-b416-3e3c57ace18c'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '98c29f7a-256f-41b0-b416-3e3c57ace18c'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '40e41e2f-13df-4b25-ac45-b9db1f4b1275'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '40e41e2f-13df-4b25-ac45-b9db1f4b1275'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '40e41e2f-13df-4b25-ac45-b9db1f4b1275'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ee555676-f8d8-4c34-a264-a08750fb9996'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7663cd0d-12e6-460f-9dec-78f1a8985d58'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7663cd0d-12e6-460f-9dec-78f1a8985d58'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6303c217-5dba-42d3-a9bc-ee609565cae9'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6303c217-5dba-42d3-a9bc-ee609565cae9'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6303c217-5dba-42d3-a9bc-ee609565cae9'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6303c217-5dba-42d3-a9bc-ee609565cae9'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9e31580e-c264-41de-989f-11751be0a56e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3c57a451-d6c5-49ca-bf46-c94786215e54'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3c57a451-d6c5-49ca-bf46-c94786215e54'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3c57a451-d6c5-49ca-bf46-c94786215e54'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1f3d84a1-292f-4836-86d3-cb0bf803193d'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1f3d84a1-292f-4836-86d3-cb0bf803193d'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '366bda7c-009b-469c-a03f-6258fdc81bcd'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '366bda7c-009b-469c-a03f-6258fdc81bcd'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '366bda7c-009b-469c-a03f-6258fdc81bcd'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '366bda7c-009b-469c-a03f-6258fdc81bcd'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '19b09e4e-efcd-4863-bc43-a0cb266de01a'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '19b09e4e-efcd-4863-bc43-a0cb266de01a'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '79484512-840c-4529-93dc-de79d425043e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '79484512-840c-4529-93dc-de79d425043e'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '79484512-840c-4529-93dc-de79d425043e'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '79484512-840c-4529-93dc-de79d425043e'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fe4eb917-6028-4878-b390-65ed795619b3'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fe4eb917-6028-4878-b390-65ed795619b3'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fe4eb917-6028-4878-b390-65ed795619b3'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '77e6476e-db9a-4fce-bae7-123645e89d81'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '77e6476e-db9a-4fce-bae7-123645e89d81'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '77e6476e-db9a-4fce-bae7-123645e89d81'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '77e6476e-db9a-4fce-bae7-123645e89d81'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '76bb3f0b-5533-43f4-8fee-7e36fe369ada'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6bedcf48-0868-45f6-b021-329047a42b10'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6bedcf48-0868-45f6-b021-329047a42b10'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6bedcf48-0868-45f6-b021-329047a42b10'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3e2706ad-9e33-4d43-9338-c6992f074067'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3e2706ad-9e33-4d43-9338-c6992f074067'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b9d5e3be-5f5f-43de-85eb-20d27e7244ee'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b9d5e3be-5f5f-43de-85eb-20d27e7244ee'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b9d5e3be-5f5f-43de-85eb-20d27e7244ee'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9801da5b-9906-4073-8df4-8bd1b58d327f'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9801da5b-9906-4073-8df4-8bd1b58d327f'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9801da5b-9906-4073-8df4-8bd1b58d327f'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2a605cce-a668-4c76-8f31-839076c4db46'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2a605cce-a668-4c76-8f31-839076c4db46'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2a605cce-a668-4c76-8f31-839076c4db46'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2a605cce-a668-4c76-8f31-839076c4db46'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4e2c2df5-b4ed-4fb2-8052-7e3876b2268d'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6e763c3a-25fb-46ef-af92-355bfa7a48e3'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6e763c3a-25fb-46ef-af92-355bfa7a48e3'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '985e2349-3b59-4cc8-a9ef-d33507d0f4bb'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '985e2349-3b59-4cc8-a9ef-d33507d0f4bb'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '985e2349-3b59-4cc8-a9ef-d33507d0f4bb'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd06b59c9-b214-4103-92df-34b79116142c'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '15192239-10a2-4de0-a8e2-351cbdaf7f47'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a38f78ac-6d8c-4b3d-be7d-20e9317551db'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a38f78ac-6d8c-4b3d-be7d-20e9317551db'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a1e331ce-411c-4f15-bd74-72fe0610957b'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a1e331ce-411c-4f15-bd74-72fe0610957b'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9dd88c6f-e2e3-4530-af79-24a047e0146f'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9dd88c6f-e2e3-4530-af79-24a047e0146f'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9dd88c6f-e2e3-4530-af79-24a047e0146f'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6f26011c-bb1b-443a-9d87-3af8167cf938'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '86270e8f-d059-476a-b82f-9ac5e616e365'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '129fa57a-898f-460e-8352-88131f701f0e'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '129fa57a-898f-460e-8352-88131f701f0e'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '73d8f021-b367-4f3d-86b6-752ff6920b45'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0d7e41e5-abeb-4725-bded-8f1c44335b29'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0d7e41e5-abeb-4725-bded-8f1c44335b29'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0d7e41e5-abeb-4725-bded-8f1c44335b29'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '29be8331-46b2-441e-88ba-1bed9a611435'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '29be8331-46b2-441e-88ba-1bed9a611435'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5215b296-2512-48ad-a73a-7716ec0c18a5'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5215b296-2512-48ad-a73a-7716ec0c18a5'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5215b296-2512-48ad-a73a-7716ec0c18a5'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6e346c96-f77e-41b3-9304-c12cb9214cb5'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6e346c96-f77e-41b3-9304-c12cb9214cb5'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6e346c96-f77e-41b3-9304-c12cb9214cb5'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c6efd895-9169-402c-87f2-9a2087afd503'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c6efd895-9169-402c-87f2-9a2087afd503'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c6efd895-9169-402c-87f2-9a2087afd503'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0055ab2e-f215-499a-aaba-6b8694d85aaf'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0055ab2e-f215-499a-aaba-6b8694d85aaf'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0055ab2e-f215-499a-aaba-6b8694d85aaf'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '29321bbb-7c48-4036-921b-330e2fe9814c'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '29321bbb-7c48-4036-921b-330e2fe9814c'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f6baf290-e80b-4ebb-88de-b8c225f12d71'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '82f14b6c-2aa8-4d66-ae6e-057131e9f322'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b1c08501-25ca-4058-866b-e0129e8d9234'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b1c08501-25ca-4058-866b-e0129e8d9234'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b1c08501-25ca-4058-866b-e0129e8d9234'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4135d823-5762-4c20-b6a0-0a3f4eb9a0bd'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4135d823-5762-4c20-b6a0-0a3f4eb9a0bd'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4135d823-5762-4c20-b6a0-0a3f4eb9a0bd'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '60352c84-b8fe-4378-ae2d-474b5c90360f'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '60352c84-b8fe-4378-ae2d-474b5c90360f'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3730e63d-6a38-4d1e-bca3-ff67ce0c82c7'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7767ea76-b34d-4beb-beb8-29d51c4ac230'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7767ea76-b34d-4beb-beb8-29d51c4ac230'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7767ea76-b34d-4beb-beb8-29d51c4ac230'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c913f16b-0604-4f63-bbb7-ade8866b2c0d'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c913f16b-0604-4f63-bbb7-ade8866b2c0d'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c913f16b-0604-4f63-bbb7-ade8866b2c0d'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f1121635-0622-4078-9195-36eb0e4b02d3'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f1121635-0622-4078-9195-36eb0e4b02d3'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f1121635-0622-4078-9195-36eb0e4b02d3'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f1121635-0622-4078-9195-36eb0e4b02d3'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fa08bb8b-5f9e-4a40-b195-26b701d2794f'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '41624bfe-ebb9-48cf-bcde-01490e2fffdc'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '41624bfe-ebb9-48cf-bcde-01490e2fffdc'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '41624bfe-ebb9-48cf-bcde-01490e2fffdc'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dca7e8d3-fa07-4d4d-8e34-b433a6180727'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dca7e8d3-fa07-4d4d-8e34-b433a6180727'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd6067ab0-40cd-4717-8c4e-d0b67a66f1d2'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd6067ab0-40cd-4717-8c4e-d0b67a66f1d2'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1574381a-482d-42e0-b777-e00c9af45ea0'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1574381a-482d-42e0-b777-e00c9af45ea0'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'df0f254e-b58c-46ad-a541-b74dee3c05a8'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'df0f254e-b58c-46ad-a541-b74dee3c05a8'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'df0f254e-b58c-46ad-a541-b74dee3c05a8'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'be689759-e106-4667-9d5a-ceebd5ed4aee'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'be689759-e106-4667-9d5a-ceebd5ed4aee'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3d03e544-fbe3-44ec-9f10-99b660316b18'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3d03e544-fbe3-44ec-9f10-99b660316b18'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '07eaaeeb-1540-4670-b82d-b14e29dc1042'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '02fb2183-6746-4782-9596-6c93810f137f'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '02fb2183-6746-4782-9596-6c93810f137f'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '02fb2183-6746-4782-9596-6c93810f137f'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a578a976-0c1d-483f-a614-f17bcacfaa18'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a578a976-0c1d-483f-a614-f17bcacfaa18'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '48b5c5cc-f48b-4eec-b7c3-a9bee19ca85e'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '48b5c5cc-f48b-4eec-b7c3-a9bee19ca85e'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '48b5c5cc-f48b-4eec-b7c3-a9bee19ca85e'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '67035968-3e7f-43cd-a6cc-2a135688b3a9'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5b691f1b-5ff9-4c39-a199-32b7b4613bbc'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5b691f1b-5ff9-4c39-a199-32b7b4613bbc'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '391e8d41-1d15-4d0e-a98f-51f4975fd182'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '67f173fe-83d1-4b74-98ba-40321fadadef'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '67f173fe-83d1-4b74-98ba-40321fadadef'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '67f173fe-83d1-4b74-98ba-40321fadadef'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '67f173fe-83d1-4b74-98ba-40321fadadef'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd1b73eb1-da92-40a5-ab9c-0329957c95ea'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a3ff3e81-7682-4e54-833c-bce10f645131'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dc65325e-bf12-4aea-966f-7b8576127878'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dc65325e-bf12-4aea-966f-7b8576127878'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a239a071-a365-44f6-8c6e-8cd92d643c15'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '821e5518-b280-4007-8766-82e67d7cb3c4'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '821e5518-b280-4007-8766-82e67d7cb3c4'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'be121454-0452-4220-8608-421a04ddb03e'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'be121454-0452-4220-8608-421a04ddb03e'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'be121454-0452-4220-8608-421a04ddb03e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'be121454-0452-4220-8608-421a04ddb03e'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9b1d83b0-9584-4721-babf-47722b212c4b'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '9b1d83b0-9584-4721-babf-47722b212c4b'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8cbd08-a294-40df-b95f-478801416b2c'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8cbd08-a294-40df-b95f-478801416b2c'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8cbd08-a294-40df-b95f-478801416b2c'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8cbd08-a294-40df-b95f-478801416b2c'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'bd7cf9f6-cfc2-4f5f-a91c-3c23ada0b2e0'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'bd7cf9f6-cfc2-4f5f-a91c-3c23ada0b2e0'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd93d6fe2-9bc4-40da-8e2e-97cdc4a90bad'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd93d6fe2-9bc4-40da-8e2e-97cdc4a90bad'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '87c1816e-28ff-48da-be7c-56fde3d2d452'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '87c1816e-28ff-48da-be7c-56fde3d2d452'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '33f924ba-843b-4f82-98d2-141c46bc31c3'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '33f924ba-843b-4f82-98d2-141c46bc31c3'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '33f924ba-843b-4f82-98d2-141c46bc31c3'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4ce8b98f-ca2d-4f65-97b6-de578c33315d'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4ce8b98f-ca2d-4f65-97b6-de578c33315d'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4ce8b98f-ca2d-4f65-97b6-de578c33315d'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3559c9a3-da74-4310-b318-2fd5e63597a8'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3559c9a3-da74-4310-b318-2fd5e63597a8'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3559c9a3-da74-4310-b318-2fd5e63597a8'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '040f96b0-e49a-4769-90a0-379551c5ee2d'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e9272d93-2d2b-4e42-a752-a686a35ab2a8'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e9272d93-2d2b-4e42-a752-a686a35ab2a8'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1476005b-7377-4e74-bf86-655d31be404d'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1476005b-7377-4e74-bf86-655d31be404d'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1476005b-7377-4e74-bf86-655d31be404d'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1476005b-7377-4e74-bf86-655d31be404d'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '92ec73d4-b380-46e9-8af2-065ae9055257'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '92ec73d4-b380-46e9-8af2-065ae9055257'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '92ec73d4-b380-46e9-8af2-065ae9055257'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '92ec73d4-b380-46e9-8af2-065ae9055257'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e5534c1c-980b-4691-b8cf-526599bbbdd0'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e5534c1c-980b-4691-b8cf-526599bbbdd0'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '236e6a8c-ebb6-4eaf-8686-158168e0ed58'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '02455515-3b73-4a33-a236-e6c06a6bb9fd'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '02455515-3b73-4a33-a236-e6c06a6bb9fd'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '02455515-3b73-4a33-a236-e6c06a6bb9fd'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dd814727-b29c-4dd8-909d-5ca6488c8eb5'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'dd814727-b29c-4dd8-909d-5ca6488c8eb5'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '6527611b-e793-43e4-8005-b72fd675347f'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c73bb7e7-b5e7-4534-b488-abbebe56e359'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '51a32e86-838e-40ae-a9c4-cedcf8160fc7'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '51a32e86-838e-40ae-a9c4-cedcf8160fc7'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '51a32e86-838e-40ae-a9c4-cedcf8160fc7'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8d21659c-c8c7-4414-b2a2-847989a9533a'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8d21659c-c8c7-4414-b2a2-847989a9533a'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8d21659c-c8c7-4414-b2a2-847989a9533a'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4f5960ef-eb70-4c80-86cb-cd54d652d129'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4f5960ef-eb70-4c80-86cb-cd54d652d129'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '08907aa8-4bb7-4e68-a3f1-054e65e96b64'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '08907aa8-4bb7-4e68-a3f1-054e65e96b64'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '08907aa8-4bb7-4e68-a3f1-054e65e96b64'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0862292a-4cb7-477c-88a8-01572b02edc1'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0862292a-4cb7-477c-88a8-01572b02edc1'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0862292a-4cb7-477c-88a8-01572b02edc1'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'b797fbad-4a03-4b15-8767-43efd16881f1'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '69a4c31d-40d6-4991-8636-e1e6a57a8017'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '69a4c31d-40d6-4991-8636-e1e6a57a8017'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '82e31eb2-3d75-4877-a80c-7e86396c2738'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '82e31eb2-3d75-4877-a80c-7e86396c2738'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '82e31eb2-3d75-4877-a80c-7e86396c2738'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '82e31eb2-3d75-4877-a80c-7e86396c2738'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ecc6d387-73ac-4e35-a323-e752ad5bd4c7'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0b1157a1-a3ad-4406-a0d2-0cbe3f66d08d'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0b1157a1-a3ad-4406-a0d2-0cbe3f66d08d'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0b1157a1-a3ad-4406-a0d2-0cbe3f66d08d'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '55a505f3-e689-4df4-b1bd-b9c90b63de9e'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '55a505f3-e689-4df4-b1bd-b9c90b63de9e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '55a505f3-e689-4df4-b1bd-b9c90b63de9e'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5c8ce1cf-2505-4bce-b529-4a1a9bee3fa5'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5c8ce1cf-2505-4bce-b529-4a1a9bee3fa5'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7153ecff-8d28-4fc9-b208-004e909a6156'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7153ecff-8d28-4fc9-b208-004e909a6156'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f885ac74-713c-43eb-9dbf-2f6096889fd3'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f885ac74-713c-43eb-9dbf-2f6096889fd3'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8ff5f808-23e7-45b3-8cee-12c224568702'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8ff5f808-23e7-45b3-8cee-12c224568702'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8ff5f808-23e7-45b3-8cee-12c224568702'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8ff5f808-23e7-45b3-8cee-12c224568702'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '24cac96d-848a-46b3-bf52-796ee3f35c94'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '24cac96d-848a-46b3-bf52-796ee3f35c94'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '24cac96d-848a-46b3-bf52-796ee3f35c94'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '24cac96d-848a-46b3-bf52-796ee3f35c94'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '52bc3f64-e3f6-44b2-a850-d7f71e7673a9'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '52bc3f64-e3f6-44b2-a850-d7f71e7673a9'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '40f46778-2b70-49ea-a641-9515c6bf8135'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '40f46778-2b70-49ea-a641-9515c6bf8135'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '40f46778-2b70-49ea-a641-9515c6bf8135'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7d95846f-e496-4420-8d67-830e2e5aea74'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7d95846f-e496-4420-8d67-830e2e5aea74'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7d95846f-e496-4420-8d67-830e2e5aea74'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7d95846f-e496-4420-8d67-830e2e5aea74'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5e4cb69a-f376-410b-a630-a1024cb16bac'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5e4cb69a-f376-410b-a630-a1024cb16bac'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5e4cb69a-f376-410b-a630-a1024cb16bac'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3852f0b4-2806-4de7-bca8-25aa3dbbe1a4'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '567fdf8c-ab6b-4928-8d9f-8ca3acadd4ef'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'cc678e75-6237-4283-b32b-f24ac53b94ad'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'cc678e75-6237-4283-b32b-f24ac53b94ad'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3df464b3-b275-4f1f-950c-6844591a7348'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3df464b3-b275-4f1f-950c-6844591a7348'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3df464b3-b275-4f1f-950c-6844591a7348'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7c9c2ee6-6e3e-4bb7-857b-3df12bc96cc2'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7c9c2ee6-6e3e-4bb7-857b-3df12bc96cc2'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7b4512c1-82c5-444e-9718-6989ead08acc'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7b4512c1-82c5-444e-9718-6989ead08acc'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7b4512c1-82c5-444e-9718-6989ead08acc'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7b4512c1-82c5-444e-9718-6989ead08acc'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a8d6d6b0-6e69-4751-9c11-d44073011ce2'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a8d6d6b0-6e69-4751-9c11-d44073011ce2'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a1c01f96-d2a0-45e8-9d75-58f037fe05d4'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a1c01f96-d2a0-45e8-9d75-58f037fe05d4'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '76ffe280-c21b-4096-aa17-e6608b81641c'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '76ffe280-c21b-4096-aa17-e6608b81641c'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '76ffe280-c21b-4096-aa17-e6608b81641c'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e2e295df-cd98-48f5-bf75-1ecd3a938b14'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '866d79b4-882e-4610-908d-65f1abddce66'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '866d79b4-882e-4610-908d-65f1abddce66'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'bd2cfcbb-faea-4215-92c8-c132bf8da238'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'bd2cfcbb-faea-4215-92c8-c132bf8da238'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'bd2cfcbb-faea-4215-92c8-c132bf8da238'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1d782048-86c4-44ad-b250-8d0e34d5561e'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7528da8e-5e08-4cf5-bbfc-4162ba4c1e57'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7528da8e-5e08-4cf5-bbfc-4162ba4c1e57'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e4bc3fa9-df8b-476f-b489-48228a714fa2'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e4bc3fa9-df8b-476f-b489-48228a714fa2'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3e41b67a-36ca-4486-a6c0-8ed471a24a9f'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3e41b67a-36ca-4486-a6c0-8ed471a24a9f'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1b9da0c9-ca52-43fb-8d45-446a80f3cf23'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1b9da0c9-ca52-43fb-8d45-446a80f3cf23'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1b9da0c9-ca52-43fb-8d45-446a80f3cf23'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '772bbc78-e611-45ed-b252-c62c89a58184'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '772bbc78-e611-45ed-b252-c62c89a58184'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '772bbc78-e611-45ed-b252-c62c89a58184'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '772bbc78-e611-45ed-b252-c62c89a58184'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a872ddeb-b14b-4205-88a7-2afd5774fff0'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a872ddeb-b14b-4205-88a7-2afd5774fff0'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a872ddeb-b14b-4205-88a7-2afd5774fff0'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '56087216-8a98-4df8-a16c-4dbf99c94e9c'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '56087216-8a98-4df8-a16c-4dbf99c94e9c'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '26aae468-b0d2-41f7-b6f6-7380dd67a60c'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '26aae468-b0d2-41f7-b6f6-7380dd67a60c'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '26aae468-b0d2-41f7-b6f6-7380dd67a60c'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '794a7f8b-1904-48a5-b407-4b85b6613ed3'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '794a7f8b-1904-48a5-b407-4b85b6613ed3'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '794a7f8b-1904-48a5-b407-4b85b6613ed3'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1e61ba1e-046d-4044-9784-704d8cd4a725'}), (s:Style {name: 'Old School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a83936a8-f6fe-4615-9030-b0fdebfc81a0'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a83936a8-f6fe-4615-9030-b0fdebfc81a0'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0b5aae9e-7115-4be6-a571-c8328a1117e7'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0b5aae9e-7115-4be6-a571-c8328a1117e7'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '0b5aae9e-7115-4be6-a571-c8328a1117e7'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a3ab9151-1259-483c-887a-388948f01cf8'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a3ab9151-1259-483c-887a-388948f01cf8'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a3ab9151-1259-483c-887a-388948f01cf8'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3edbc498-55b5-485d-81a7-2902da3f6893'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3edbc498-55b5-485d-81a7-2902da3f6893'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5c63871c-c87f-40d6-8eff-7582ffecb7ed'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '5ee83f4c-3812-422e-8969-e6f9d71d2d25'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '85c8b8c3-91e1-4577-a4d6-36ba2338af44'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '85c8b8c3-91e1-4577-a4d6-36ba2338af44'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c05fbe90-288a-4bc9-a099-b06f81ce2c92'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a8984ae8-1699-4190-b367-6cd3134953d2'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'a8984ae8-1699-4190-b367-6cd3134953d2'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3000a0b8-e841-4a45-a7af-cdbc1ac555fd'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3000a0b8-e841-4a45-a7af-cdbc1ac555fd'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3000a0b8-e841-4a45-a7af-cdbc1ac555fd'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '546acb61-e7e5-43c0-9434-a53a0781c89a'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '546acb61-e7e5-43c0-9434-a53a0781c89a'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'e2741d5d-76fd-4aa9-80ce-c895a4bc5726'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ef41eded-9b52-4124-8575-a2018ed200db'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ef41eded-9b52-4124-8575-a2018ed200db'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ef41eded-9b52-4124-8575-a2018ed200db'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ef41eded-9b52-4124-8575-a2018ed200db'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f57663d2-7d36-4407-ab69-4ce308865e70'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f57663d2-7d36-4407-ab69-4ce308865e70'}), (s:Style {name: 'Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '52cfc283-3d3f-478f-8e69-5497c0a21240'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '52cfc283-3d3f-478f-8e69-5497c0a21240'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '52cfc283-3d3f-478f-8e69-5497c0a21240'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '52cfc283-3d3f-478f-8e69-5497c0a21240'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3890674b-a870-4abb-b32e-b7cc18548349'}), (s:Style {name: 'Surrealism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '3890674b-a870-4abb-b32e-b7cc18548349'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7d1920ae-0df9-4727-b459-352346efd0bd'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '7d1920ae-0df9-4727-b459-352346efd0bd'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'ed91da3c-a198-45ad-97ed-b3160be1192d'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '97db48a6-0c51-4c89-88f7-4b941569e0a9'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '97db48a6-0c51-4c89-88f7-4b941569e0a9'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '434098b1-bccd-49c8-b771-4683a861fcea'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '434098b1-bccd-49c8-b771-4683a861fcea'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '386bf3d6-f358-4738-9ddb-5079ebca7909'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '386bf3d6-f358-4738-9ddb-5079ebca7909'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8bcf0b-fb25-422f-877c-ac1c7a13d57d'}), (s:Style {name: 'Tribal'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8bcf0b-fb25-422f-877c-ac1c7a13d57d'}), (s:Style {name: 'Illustrative'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'fc8bcf0b-fb25-422f-877c-ac1c7a13d57d'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8df11dfe-b26b-4299-82c9-269c9b3ad476'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8df11dfe-b26b-4299-82c9-269c9b3ad476'}), (s:Style {name: 'Blackwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1e242c36-a916-4c94-ab2d-1265f74dd48b'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1e242c36-a916-4c94-ab2d-1265f74dd48b'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1e242c36-a916-4c94-ab2d-1265f74dd48b'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f56e08f5-7a4c-4b77-95f6-1cdebcf1938f'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f56e08f5-7a4c-4b77-95f6-1cdebcf1938f'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'f56e08f5-7a4c-4b77-95f6-1cdebcf1938f'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c8f53513-6e40-43f0-9d0f-81fe16302e20'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c8f53513-6e40-43f0-9d0f-81fe16302e20'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c8f53513-6e40-43f0-9d0f-81fe16302e20'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1371fabb-9b03-4bbe-810d-e9d9c92bbcd3'}), (s:Style {name: 'Abstract'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '1371fabb-9b03-4bbe-810d-e9d9c92bbcd3'}), (s:Style {name: 'Portrait'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c30d7b12-4802-4ea3-8105-c4a45c013cea'}), (s:Style {name: 'Dotwork'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'c30d7b12-4802-4ea3-8105-c4a45c013cea'}), (s:Style {name: 'Geometric'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738'}), (s:Style {name: 'Photo Realism'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738'}), (s:Style {name: 'Watercolor'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2510c2ea-ff53-4f3e-9c28-b456e5384fa6'}), (s:Style {name: 'New School'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2510c2ea-ff53-4f3e-9c28-b456e5384fa6'}), (s:Style {name: 'Lettering'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2510c2ea-ff53-4f3e-9c28-b456e5384fa6'}), (s:Style {name: 'Neo-Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd294198f-f290-4db6-904d-ee2ff4cf30a1'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: 'd294198f-f290-4db6-904d-ee2ff4cf30a1'}), (s:Style {name: 'Japanese'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c994788-0cd3-454a-b46b-5399baabff99'}), (s:Style {name: 'Fine Line'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c994788-0cd3-454a-b46b-5399baabff99'}), (s:Style {name: 'Minimalist'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c994788-0cd3-454a-b46b-5399baabff99'}), (s:Style {name: 'Traditional'}) MERGE (a)-[:SPECIALIZES_IN]->(s);
MATCH (a:Artist {id: '2c994788-0cd3-454a-b46b-5399baabff99'}), (s:Style {name: 'Biomechanical'}) MERGE (a)-[:SPECIALIZES_IN]->(s);

// Create FEATURES_STYLE relationships (Shop -> Style)
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'San Diego', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Diego', state: 'California'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Perth', state: 'Western Australia'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'San Diego', state: 'California'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Tampa', state: 'Florida'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Diego', state: 'California'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Diego', state: 'California'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'San Diego', state: 'California'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'San Diego', state: 'California'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'San Diego', state: 'California'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Los Angeles', state: 'California'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Denver', state: 'Colorado'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Phoenix', state: 'Arizona'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Dallas', state: 'Texas'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Black Anchor Collective', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Old School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Electric Rose Parlor', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'San Diego', state: 'California'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Sydney', state: 'New South Wales'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Brooklyn', state: 'New York'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Montreal', state: 'Quebec'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'Surrealism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Raven & Rose Ink', city: 'Toronto', state: 'Ontario'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Miami', state: 'Florida'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Houston', state: 'Texas'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Old Soul Tattoo Co.', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Crimson Lotus Studio', city: 'Jersey City', state: 'New Jersey'}), (s:Style {name: 'Illustrative'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Diego', state: 'California'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Ink & Iron Studio', city: 'San Diego', state: 'California'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Tribal'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Steel & Bone Tattoo', city: 'Tucson', state: 'Arizona'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Northern Lights Tattoo', city: 'Manhattan', state: 'New York'}), (s:Style {name: 'Blackwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'San Francisco', state: 'California'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'San Francisco', state: 'California'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Sacred Art Collective', city: 'Newark', state: 'New Jersey'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Abstract'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Portland', state: 'Oregon'}), (s:Style {name: 'Portrait'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Dotwork'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Vancouver', state: 'British Columbia'}), (s:Style {name: 'Geometric'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Photo Realism'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Minimalist'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Golden Needle Tattoo', city: 'Ewing Township', state: 'New Jersey'}), (s:Style {name: 'Watercolor'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Austin', state: 'Texas'}), (s:Style {name: 'New School'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Lettering'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Wildflower Ink', city: 'Austin', state: 'Texas'}), (s:Style {name: 'Neo-Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Burlington', state: 'Vermont'}), (s:Style {name: 'Japanese'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Fine Line'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Traditional'}) MERGE (sh)-[:FEATURES_STYLE]->(s);
MATCH (sh:Shop {name: 'Midnight Owl Tattoo', city: 'Melbourne', state: 'Victoria'}), (s:Style {name: 'Biomechanical'}) MERGE (sh)-[:FEATURES_STYLE]->(s);

// Create HAS_WEBSITE relationships (Artist -> Website)
MATCH (a:Artist {id: '5835eaa6-f203-43b9-af47-485c58a2e52c'}), (w:Website {url: 'https://tatt.example.com/artists/02ec4ea7-b5ab-4d24-b392-91c639a33e2c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '8e8045d7-4f3f-4e4e-8bd8-a93d8b478ca6'}), (w:Website {url: 'https://tatt.example.com/artists/e1875c2c-10a3-4039-b377-03978aaaf373'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6f3591de-bea3-4e00-8039-64981a8e099d'}), (w:Website {url: 'https://tatt.example.com/artists/27d4efd6-8f1a-4a40-8ab5-8a41d6b1fc06'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '095ab55f-df1b-45b9-be2e-d7305c7ebd23'}), (w:Website {url: 'https://tatt.example.com/artists/80de89fd-be02-4b1e-ac16-46f1f39a0c91'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c10e9891-b537-4baf-a0a2-d63e9edba3d1'}), (w:Website {url: 'https://tatt.example.com/artists/6b1ec7db-c0fc-4fb1-a8ff-3077bb0af9f6'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c623ff67-bbf3-44e7-916c-550ec58ff314'}), (w:Website {url: 'https://tatt.example.com/artists/40813085-13b6-4a29-b879-f01f040a9939'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3557a401-d44d-430d-a755-cccdef2af361'}), (w:Website {url: 'https://tatt.example.com/artists/e03838cc-1a98-438a-8e06-2666a9eb254c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c665b9b3-f4d8-4449-a57d-c188e8aa3e61'}), (w:Website {url: 'https://tatt.example.com/artists/df298d63-7296-4996-aae2-ffc6b08604a9'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'db89ef64-3441-4646-a7c2-faa56526db5e'}), (w:Website {url: 'https://tatt.example.com/artists/74a64337-b7a5-41fc-bb68-e1d70eb26de1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '98c29f7a-256f-41b0-b416-3e3c57ace18c'}), (w:Website {url: 'https://tatt.example.com/artists/b7c2d56c-a819-4af8-9d64-7cd95195fe24'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '40e41e2f-13df-4b25-ac45-b9db1f4b1275'}), (w:Website {url: 'https://tatt.example.com/artists/db05903d-9ce1-4cac-997e-74a7f2416c09'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'ee555676-f8d8-4c34-a264-a08750fb9996'}), (w:Website {url: 'https://tatt.example.com/artists/dfeead78-eb22-4fa6-9525-c3fd4a96691b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7663cd0d-12e6-460f-9dec-78f1a8985d58'}), (w:Website {url: 'https://tatt.example.com/artists/825b7e04-23a3-4e8f-9f09-efb1917f5110'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '9c7ac04d-02d0-4f02-aa3d-da135da588bd'}), (w:Website {url: 'https://tatt.example.com/artists/582b5060-279d-4995-9c17-fefd69cd4d78'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6303c217-5dba-42d3-a9bc-ee609565cae9'}), (w:Website {url: 'https://tatt.example.com/artists/57b00981-0e8d-4dac-8994-11934525e36f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '9e31580e-c264-41de-989f-11751be0a56e'}), (w:Website {url: 'https://tatt.example.com/artists/45d109a6-31da-4142-809e-ecc715deac1f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3c57a451-d6c5-49ca-bf46-c94786215e54'}), (w:Website {url: 'https://tatt.example.com/artists/f3bfb91c-d8cf-4cff-8f29-64328eb90817'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3f752f02-2847-46f4-a184-6e8d5bc1b776'}), (w:Website {url: 'https://tatt.example.com/artists/cd699690-83de-4c2e-af86-e2e83282aa74'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1f3d84a1-292f-4836-86d3-cb0bf803193d'}), (w:Website {url: 'https://tatt.example.com/artists/d28d6312-d613-453a-8ecc-9b8570e58290'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '919a288d-b342-4dc4-a0cc-a3b38585a5fe'}), (w:Website {url: 'https://tatt.example.com/artists/aa0f045a-7ba9-4bb2-9906-d15fdcce3f87'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '366bda7c-009b-469c-a03f-6258fdc81bcd'}), (w:Website {url: 'https://tatt.example.com/artists/01d3bac0-42a3-4c93-a21e-ab7035644e58'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '19b09e4e-efcd-4863-bc43-a0cb266de01a'}), (w:Website {url: 'https://tatt.example.com/artists/ca3ba148-37cb-438c-83e1-194ea1460121'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '79484512-840c-4529-93dc-de79d425043e'}), (w:Website {url: 'https://tatt.example.com/artists/eabc1032-2b0e-4c55-88a8-94376675f5b5'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'fe4eb917-6028-4878-b390-65ed795619b3'}), (w:Website {url: 'https://tatt.example.com/artists/01c1415e-279d-4505-b702-7a79bf9c4daf'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '77e6476e-db9a-4fce-bae7-123645e89d81'}), (w:Website {url: 'https://tatt.example.com/artists/cb7836ef-4a07-4681-a2f3-b5e6b9dbe0fb'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '76bb3f0b-5533-43f4-8fee-7e36fe369ada'}), (w:Website {url: 'https://tatt.example.com/artists/a1de1fef-071e-4bed-a493-7466a2f7536e'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6bedcf48-0868-45f6-b021-329047a42b10'}), (w:Website {url: 'https://tatt.example.com/artists/f2ee6f1c-ed20-4077-a0c9-485c07b01ea7'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6556f12c-c8fb-4268-9680-c7ddc546e86c'}), (w:Website {url: 'https://tatt.example.com/artists/e603bf28-89ce-45e6-b4f4-dc6bd294ebd8'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3e2706ad-9e33-4d43-9338-c6992f074067'}), (w:Website {url: 'https://tatt.example.com/artists/efb44674-b3a1-413c-a264-a2b098cbe12d'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'b9d5e3be-5f5f-43de-85eb-20d27e7244ee'}), (w:Website {url: 'https://tatt.example.com/artists/0d4b1025-61bd-47a8-9afc-4ec6078ad116'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '9801da5b-9906-4073-8df4-8bd1b58d327f'}), (w:Website {url: 'https://tatt.example.com/artists/873ea4ff-f072-414d-b8df-2ff42238a937'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '2a605cce-a668-4c76-8f31-839076c4db46'}), (w:Website {url: 'https://tatt.example.com/artists/bc73b9c9-97d9-425e-8744-e720c77a5e03'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '4e2c2df5-b4ed-4fb2-8052-7e3876b2268d'}), (w:Website {url: 'https://tatt.example.com/artists/f9d652ac-4a01-43b4-850c-95825322894c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6e763c3a-25fb-46ef-af92-355bfa7a48e3'}), (w:Website {url: 'https://tatt.example.com/artists/0a28b513-2c11-457c-9c68-9e0ae3ef5660'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '985e2349-3b59-4cc8-a9ef-d33507d0f4bb'}), (w:Website {url: 'https://tatt.example.com/artists/166bd7f3-2003-4837-a9ce-d9e10ee90581'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd06b59c9-b214-4103-92df-34b79116142c'}), (w:Website {url: 'https://tatt.example.com/artists/f1a0b768-0472-443e-8a23-9473725f85b9'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '15192239-10a2-4de0-a8e2-351cbdaf7f47'}), (w:Website {url: 'https://tatt.example.com/artists/b0171ad5-23ea-4255-ac2b-b8f57ba5755a'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a38f78ac-6d8c-4b3d-be7d-20e9317551db'}), (w:Website {url: 'https://tatt.example.com/artists/4bffb4db-abca-4353-959d-769162a2108b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a1e331ce-411c-4f15-bd74-72fe0610957b'}), (w:Website {url: 'https://tatt.example.com/artists/9fdb55b9-09d7-4b91-93b1-16b0cb5d9131'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '9dd88c6f-e2e3-4530-af79-24a047e0146f'}), (w:Website {url: 'https://tatt.example.com/artists/cdfe7071-2ccb-47c2-81c3-5dd33a81155d'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '071f7135-68bb-4301-9a86-3b9301d7eeeb'}), (w:Website {url: 'https://tatt.example.com/artists/0d202717-ec86-4522-93be-a317df75e43b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6f26011c-bb1b-443a-9d87-3af8167cf938'}), (w:Website {url: 'https://tatt.example.com/artists/ffab5f09-8dec-4eb5-94ab-05d05ce1b19c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '86270e8f-d059-476a-b82f-9ac5e616e365'}), (w:Website {url: 'https://tatt.example.com/artists/5dc40bc5-bb87-4962-878e-adfa856eb29a'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '129fa57a-898f-460e-8352-88131f701f0e'}), (w:Website {url: 'https://tatt.example.com/artists/89ae036f-c4f9-457e-8e06-c56a0932f4c7'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '73d8f021-b367-4f3d-86b6-752ff6920b45'}), (w:Website {url: 'https://tatt.example.com/artists/b99f3948-6226-48c6-8028-37e618993ac8'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '57de2a11-9ad5-4586-91c1-8d2b825d6199'}), (w:Website {url: 'https://tatt.example.com/artists/17055dd8-eac3-42ff-8d4b-5344f396a8d0'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '0d7e41e5-abeb-4725-bded-8f1c44335b29'}), (w:Website {url: 'https://tatt.example.com/artists/daf9d710-8413-49a6-8e1d-32bf0a168442'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '29be8331-46b2-441e-88ba-1bed9a611435'}), (w:Website {url: 'https://tatt.example.com/artists/21c8ce76-3865-4b52-bc53-6e7f69e589f0'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5215b296-2512-48ad-a73a-7716ec0c18a5'}), (w:Website {url: 'https://tatt.example.com/artists/1fea2547-2a89-47b1-ab05-8975debbb4d2'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '39d0c0b4-ab78-4c70-a369-12dc368a5671'}), (w:Website {url: 'https://tatt.example.com/artists/80486930-efc8-4fda-8929-243fba50bf32'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6e346c96-f77e-41b3-9304-c12cb9214cb5'}), (w:Website {url: 'https://tatt.example.com/artists/0aebd6ab-76d6-49d4-a6a9-a21db2ff101b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c6efd895-9169-402c-87f2-9a2087afd503'}), (w:Website {url: 'https://tatt.example.com/artists/c7c0dd8c-2501-4c26-8683-4efa31d67dc3'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '0055ab2e-f215-499a-aaba-6b8694d85aaf'}), (w:Website {url: 'https://tatt.example.com/artists/7b01beca-822b-4d70-a36a-cb71f521558d'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '29321bbb-7c48-4036-921b-330e2fe9814c'}), (w:Website {url: 'https://tatt.example.com/artists/f7750213-8481-4fae-a637-9b37f9d203a8'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '32354ba5-13ac-4a0d-b624-3d081a49e65a'}), (w:Website {url: 'https://tatt.example.com/artists/89b6748c-9d6a-49b0-820c-04c49d357a92'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f6baf290-e80b-4ebb-88de-b8c225f12d71'}), (w:Website {url: 'https://tatt.example.com/artists/fedc8f0a-aab3-4875-9474-71bd5fce3a81'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '82f14b6c-2aa8-4d66-ae6e-057131e9f322'}), (w:Website {url: 'https://tatt.example.com/artists/dc08cc84-4a59-48a1-aa74-9c5dd4207c7b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'b1c08501-25ca-4058-866b-e0129e8d9234'}), (w:Website {url: 'https://tatt.example.com/artists/7d0d6a41-84b1-4de4-86f9-9198b9948b47'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '4135d823-5762-4c20-b6a0-0a3f4eb9a0bd'}), (w:Website {url: 'https://tatt.example.com/artists/12e293e3-d08c-4053-a1d4-17ba1d640cd2'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '60352c84-b8fe-4378-ae2d-474b5c90360f'}), (w:Website {url: 'https://tatt.example.com/artists/c8a212d2-3e9f-43de-87cb-c83e9c137184'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3730e63d-6a38-4d1e-bca3-ff67ce0c82c7'}), (w:Website {url: 'https://tatt.example.com/artists/8167c8af-370e-4440-8f32-cb7f10a73a40'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7767ea76-b34d-4beb-beb8-29d51c4ac230'}), (w:Website {url: 'https://tatt.example.com/artists/dea89f6b-9d56-4250-b865-2220dc93e55b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c913f16b-0604-4f63-bbb7-ade8866b2c0d'}), (w:Website {url: 'https://tatt.example.com/artists/1edbb126-1090-4b69-9ebd-f1f6064fdc44'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f1121635-0622-4078-9195-36eb0e4b02d3'}), (w:Website {url: 'https://tatt.example.com/artists/c686ad25-7d2b-4a9d-9c8b-b909112d67fe'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'fa08bb8b-5f9e-4a40-b195-26b701d2794f'}), (w:Website {url: 'https://tatt.example.com/artists/30273995-8751-4031-879d-bd042197df09'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '41624bfe-ebb9-48cf-bcde-01490e2fffdc'}), (w:Website {url: 'https://tatt.example.com/artists/bba06ada-0794-4ac1-9957-cd2aeaa3bcf4'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'dca7e8d3-fa07-4d4d-8e34-b433a6180727'}), (w:Website {url: 'https://tatt.example.com/artists/7ba9a7b1-aa79-496a-8ef9-691fe6d32a03'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd6067ab0-40cd-4717-8c4e-d0b67a66f1d2'}), (w:Website {url: 'https://tatt.example.com/artists/1702a915-e2d8-4a0e-baab-358a21c32243'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1574381a-482d-42e0-b777-e00c9af45ea0'}), (w:Website {url: 'https://tatt.example.com/artists/1c6ef356-585f-4cba-afee-dbecffa24c5e'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'df0f254e-b58c-46ad-a541-b74dee3c05a8'}), (w:Website {url: 'https://tatt.example.com/artists/f0bac8f5-4ab3-4ff0-b3f6-d23e82b9259f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'be689759-e106-4667-9d5a-ceebd5ed4aee'}), (w:Website {url: 'https://tatt.example.com/artists/a1746a2e-ab33-4aaa-8316-5b9521d1b51f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3d03e544-fbe3-44ec-9f10-99b660316b18'}), (w:Website {url: 'https://tatt.example.com/artists/c05a8efc-216e-4dad-a8c4-f8c6ebb073c4'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '07eaaeeb-1540-4670-b82d-b14e29dc1042'}), (w:Website {url: 'https://tatt.example.com/artists/f867bf09-1f37-493e-a6eb-c9900fb67be9'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '02fb2183-6746-4782-9596-6c93810f137f'}), (w:Website {url: 'https://tatt.example.com/artists/e2927c19-3bc8-489f-90e2-e1db441fb3f8'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f2851c38-245b-4f47-a1cd-79f24f164f98'}), (w:Website {url: 'https://tatt.example.com/artists/87b101fa-70d7-4e08-a587-3f93bda1fc2c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a578a976-0c1d-483f-a614-f17bcacfaa18'}), (w:Website {url: 'https://tatt.example.com/artists/a4db8488-9bab-401d-9865-717f3eec405b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '48b5c5cc-f48b-4eec-b7c3-a9bee19ca85e'}), (w:Website {url: 'https://tatt.example.com/artists/527e872f-eb50-4032-87f9-8fbc319d35f8'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '67035968-3e7f-43cd-a6cc-2a135688b3a9'}), (w:Website {url: 'https://tatt.example.com/artists/0e02fddd-9a6b-4e43-a9e1-5b552b9df443'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5b691f1b-5ff9-4c39-a199-32b7b4613bbc'}), (w:Website {url: 'https://tatt.example.com/artists/51796989-7206-411a-8de1-e435f7ec5645'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '391e8d41-1d15-4d0e-a98f-51f4975fd182'}), (w:Website {url: 'https://tatt.example.com/artists/b8193036-f2eb-493f-badb-c7aa6bd62557'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '67f173fe-83d1-4b74-98ba-40321fadadef'}), (w:Website {url: 'https://tatt.example.com/artists/12e8774b-56c9-45a0-8717-cc086c4f074c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'dd4b1bd3-ff34-4f30-8154-a3fd9b60e98e'}), (w:Website {url: 'https://tatt.example.com/artists/1241a38a-a335-4298-a24f-9c5ea28c52ea'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd1b73eb1-da92-40a5-ab9c-0329957c95ea'}), (w:Website {url: 'https://tatt.example.com/artists/19898389-5351-4e8c-aae5-d0aba0a876bb'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a3ff3e81-7682-4e54-833c-bce10f645131'}), (w:Website {url: 'https://tatt.example.com/artists/32b2bc5f-5bf9-4a83-8b44-def4b518dc16'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'dc65325e-bf12-4aea-966f-7b8576127878'}), (w:Website {url: 'https://tatt.example.com/artists/1e85273b-e2ca-4626-aa5a-a79f69d51e4a'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a239a071-a365-44f6-8c6e-8cd92d643c15'}), (w:Website {url: 'https://tatt.example.com/artists/d06d1a66-61c4-4c6a-8783-044f4942e389'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '821e5518-b280-4007-8766-82e67d7cb3c4'}), (w:Website {url: 'https://tatt.example.com/artists/631b64cc-f4b0-4703-9ab1-8200999c4e15'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'be121454-0452-4220-8608-421a04ddb03e'}), (w:Website {url: 'https://tatt.example.com/artists/25322e36-4532-4377-a51d-eda2090bdc94'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '9b1d83b0-9584-4721-babf-47722b212c4b'}), (w:Website {url: 'https://tatt.example.com/artists/3d28083b-38c4-4ab1-84fa-03eb362b0b49'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd05b8c77-0686-42ee-b93d-0090d0f9ba9c'}), (w:Website {url: 'https://tatt.example.com/artists/f43bd8a4-e87c-40d3-87aa-928f14138df9'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'fc8cbd08-a294-40df-b95f-478801416b2c'}), (w:Website {url: 'https://tatt.example.com/artists/8b1547e9-f41a-439e-b360-a25361db81dd'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'bd7cf9f6-cfc2-4f5f-a91c-3c23ada0b2e0'}), (w:Website {url: 'https://tatt.example.com/artists/58f516c7-63f1-42a4-9898-81da20be338c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd93d6fe2-9bc4-40da-8e2e-97cdc4a90bad'}), (w:Website {url: 'https://tatt.example.com/artists/f99194a9-4b09-4a60-9eee-b5459994a904'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '87c1816e-28ff-48da-be7c-56fde3d2d452'}), (w:Website {url: 'https://tatt.example.com/artists/2821c6df-f1fa-4db3-84b0-1a8dad489cac'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '33f924ba-843b-4f82-98d2-141c46bc31c3'}), (w:Website {url: 'https://tatt.example.com/artists/e2e69714-2a4e-480c-adc4-ad809d91df91'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '4ce8b98f-ca2d-4f65-97b6-de578c33315d'}), (w:Website {url: 'https://tatt.example.com/artists/c2d5d3d7-4be1-4f39-84cc-d95732bb5e83'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3559c9a3-da74-4310-b318-2fd5e63597a8'}), (w:Website {url: 'https://tatt.example.com/artists/27a81df8-a503-48df-ab73-b8cb477ea768'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '040f96b0-e49a-4769-90a0-379551c5ee2d'}), (w:Website {url: 'https://tatt.example.com/artists/868d428b-c166-46f0-b84f-a3a8c2d0b1c1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '2c188c54-7ab6-431b-8084-16a8c4b2ff04'}), (w:Website {url: 'https://tatt.example.com/artists/a50af504-6a63-408d-9bad-74ad4962cf23'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'e9272d93-2d2b-4e42-a752-a686a35ab2a8'}), (w:Website {url: 'https://tatt.example.com/artists/164c2abb-edd0-4113-8824-d5265664a054'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5643b371-ebc2-4eb5-8c59-9f1eec546cfa'}), (w:Website {url: 'https://tatt.example.com/artists/d5b29c10-a0a3-4514-9e9b-786ccd3f65ff'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1476005b-7377-4e74-bf86-655d31be404d'}), (w:Website {url: 'https://tatt.example.com/artists/985dae58-33c8-493e-a2a8-5f69bf56aae7'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '92ec73d4-b380-46e9-8af2-065ae9055257'}), (w:Website {url: 'https://tatt.example.com/artists/9eda7756-9de2-4e66-a29f-049045a48f2b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'e5534c1c-980b-4691-b8cf-526599bbbdd0'}), (w:Website {url: 'https://tatt.example.com/artists/0cde749e-41c9-4ef6-8461-416f5a41fcf4'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '236e6a8c-ebb6-4eaf-8686-158168e0ed58'}), (w:Website {url: 'https://tatt.example.com/artists/da891e8d-aaf6-4f31-aa37-8459d0f3b7c6'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '02455515-3b73-4a33-a236-e6c06a6bb9fd'}), (w:Website {url: 'https://tatt.example.com/artists/27fcf78f-966e-4c5f-98e7-6270abaf15ec'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f18a5789-de8e-430b-97ad-a1452c34f4bd'}), (w:Website {url: 'https://tatt.example.com/artists/695ac992-26c6-4294-b8bb-769799ae83ba'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'dd814727-b29c-4dd8-909d-5ca6488c8eb5'}), (w:Website {url: 'https://tatt.example.com/artists/85944c04-a6d4-42b1-ae46-c5161092ea1c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '6527611b-e793-43e4-8005-b72fd675347f'}), (w:Website {url: 'https://tatt.example.com/artists/2227decc-aa11-4d51-836b-62c909163050'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '19f5edd4-2c58-4165-9504-58bc6e0565f7'}), (w:Website {url: 'https://tatt.example.com/artists/abddb203-989d-47df-b2af-40675117e7ba'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c73bb7e7-b5e7-4534-b488-abbebe56e359'}), (w:Website {url: 'https://tatt.example.com/artists/667a9960-fba3-4e7c-8af2-1f743e38f80d'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '51a32e86-838e-40ae-a9c4-cedcf8160fc7'}), (w:Website {url: 'https://tatt.example.com/artists/ab93473e-9c5b-46ac-ab3b-cea9395262b7'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '8d21659c-c8c7-4414-b2a2-847989a9533a'}), (w:Website {url: 'https://tatt.example.com/artists/44ec0c78-504e-46af-bdfb-86ed59356088'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '2df99554-ea53-4d18-8639-c5e3f800ea1f'}), (w:Website {url: 'https://tatt.example.com/artists/12c8b512-e2c0-4ceb-a7bf-15700be85042'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '4f5960ef-eb70-4c80-86cb-cd54d652d129'}), (w:Website {url: 'https://tatt.example.com/artists/54a96639-0554-41c7-8960-b8c2e3c83ef5'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f22a5477-40a0-46c7-bb4c-d8757da3f42e'}), (w:Website {url: 'https://tatt.example.com/artists/e2fac8ae-7ff9-47a6-8a0a-81de7df33895'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '08907aa8-4bb7-4e68-a3f1-054e65e96b64'}), (w:Website {url: 'https://tatt.example.com/artists/00a4b0ca-6c76-43b4-9b2a-f5c70e068df6'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '0862292a-4cb7-477c-88a8-01572b02edc1'}), (w:Website {url: 'https://tatt.example.com/artists/a0cbb42b-e8b1-4c88-8f18-17940e114812'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'b797fbad-4a03-4b15-8767-43efd16881f1'}), (w:Website {url: 'https://tatt.example.com/artists/9f42d080-9683-4db3-acf7-82ec80574137'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '39ac7737-d6ec-43c4-ba53-8eab2f4b02c0'}), (w:Website {url: 'https://tatt.example.com/artists/3c2ac00b-e108-4a9c-97a8-3b981ed0a7cd'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '69a4c31d-40d6-4991-8636-e1e6a57a8017'}), (w:Website {url: 'https://tatt.example.com/artists/90a2cd84-b6c4-446f-962c-a0325707942c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '82e31eb2-3d75-4877-a80c-7e86396c2738'}), (w:Website {url: 'https://tatt.example.com/artists/971003c5-5357-4de5-897e-822d12b249f0'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'ecc6d387-73ac-4e35-a323-e752ad5bd4c7'}), (w:Website {url: 'https://tatt.example.com/artists/9879dab7-1558-4c5c-9dd7-244d655fa75c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '0b1157a1-a3ad-4406-a0d2-0cbe3f66d08d'}), (w:Website {url: 'https://tatt.example.com/artists/e1a65f0c-be0a-43f0-b24b-dcf2a9f974bc'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '55a505f3-e689-4df4-b1bd-b9c90b63de9e'}), (w:Website {url: 'https://tatt.example.com/artists/cec6c64a-468c-45eb-afed-3e8ff3e15c4e'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5c8ce1cf-2505-4bce-b529-4a1a9bee3fa5'}), (w:Website {url: 'https://tatt.example.com/artists/0f14220f-c32d-477b-8c1e-4b1ea5ea0cdf'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7153ecff-8d28-4fc9-b208-004e909a6156'}), (w:Website {url: 'https://tatt.example.com/artists/61da5699-6d49-4f94-a3ae-46416658f110'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f885ac74-713c-43eb-9dbf-2f6096889fd3'}), (w:Website {url: 'https://tatt.example.com/artists/1ca2b168-ee11-46dc-be4d-90bac01ae025'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '20aa526f-b01b-45fb-afd1-a6d510e06e35'}), (w:Website {url: 'https://tatt.example.com/artists/da589d6e-aa23-4d66-93d3-55dfad15807c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '18502e2f-b038-41b7-9cd8-4a5a1ddd417c'}), (w:Website {url: 'https://tatt.example.com/artists/1365a247-d8e9-4d5f-ba99-ea40d41eaac7'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '8ff5f808-23e7-45b3-8cee-12c224568702'}), (w:Website {url: 'https://tatt.example.com/artists/58f771ab-3585-4b39-b315-93462735fead'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '24cac96d-848a-46b3-bf52-796ee3f35c94'}), (w:Website {url: 'https://tatt.example.com/artists/0a9f6720-0262-4b5e-b66f-9812014046da'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '52bc3f64-e3f6-44b2-a850-d7f71e7673a9'}), (w:Website {url: 'https://tatt.example.com/artists/f1fbfd69-cc2c-43ef-adc2-110382f208d8'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '40f46778-2b70-49ea-a641-9515c6bf8135'}), (w:Website {url: 'https://tatt.example.com/artists/16b95029-b95c-44d5-9df1-8b47dc018af9'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7d95846f-e496-4420-8d67-830e2e5aea74'}), (w:Website {url: 'https://tatt.example.com/artists/dc8e9a11-40a7-4591-a6af-52dc4107c430'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'edc8a80b-1215-4ae1-a6da-e7869fa1ea70'}), (w:Website {url: 'https://tatt.example.com/artists/20166476-37a4-4dd7-9202-6c5fc7c9b08e'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5e4cb69a-f376-410b-a630-a1024cb16bac'}), (w:Website {url: 'https://tatt.example.com/artists/ce8173d1-e14e-4d6f-9cb3-52803c18f9c2'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3852f0b4-2806-4de7-bca8-25aa3dbbe1a4'}), (w:Website {url: 'https://tatt.example.com/artists/48eddb39-3fee-4096-a334-5b03b36eb252'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'e4b97ef5-743e-4efc-8bad-526e2cd3f8b9'}), (w:Website {url: 'https://tatt.example.com/artists/80dca9eb-b033-4581-bfd7-c209771ca541'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '567fdf8c-ab6b-4928-8d9f-8ca3acadd4ef'}), (w:Website {url: 'https://tatt.example.com/artists/e78fd9ce-2cdb-41d6-b0ec-c232d3fcad3c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'cc678e75-6237-4283-b32b-f24ac53b94ad'}), (w:Website {url: 'https://tatt.example.com/artists/91cb3435-177b-4564-b66a-801550556b56'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3df464b3-b275-4f1f-950c-6844591a7348'}), (w:Website {url: 'https://tatt.example.com/artists/d167a7ba-6e57-4762-8160-3a1ce4a192f1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7c9c2ee6-6e3e-4bb7-857b-3df12bc96cc2'}), (w:Website {url: 'https://tatt.example.com/artists/93a422a6-450f-411a-a5fd-61ef185fa978'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7b4512c1-82c5-444e-9718-6989ead08acc'}), (w:Website {url: 'https://tatt.example.com/artists/300295f7-6c15-4390-9571-16f5abc95406'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a8d6d6b0-6e69-4751-9c11-d44073011ce2'}), (w:Website {url: 'https://tatt.example.com/artists/2e2029ca-2b24-4c73-9792-d6ba824c28f4'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a1c01f96-d2a0-45e8-9d75-58f037fe05d4'}), (w:Website {url: 'https://tatt.example.com/artists/71397102-522c-4894-9b50-41919acb12fb'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '76ffe280-c21b-4096-aa17-e6608b81641c'}), (w:Website {url: 'https://tatt.example.com/artists/ab019fb6-e5d7-40da-9d65-cd591c0d5ce1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5d5505c8-c2af-49d7-b7ed-e00111ddcad3'}), (w:Website {url: 'https://tatt.example.com/artists/c42b54ea-4716-4551-995e-fa1b6bcd7912'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3278b9ab-5e84-4203-a5d3-3f0f5c53ebf6'}), (w:Website {url: 'https://tatt.example.com/artists/62cc7776-049a-4f86-968e-ad101dcffcc9'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'e2e295df-cd98-48f5-bf75-1ecd3a938b14'}), (w:Website {url: 'https://tatt.example.com/artists/87ced077-1918-469f-b118-9e0f38f9c99e'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '866d79b4-882e-4610-908d-65f1abddce66'}), (w:Website {url: 'https://tatt.example.com/artists/a5e289d0-833d-45c9-90d8-7d5d32cd6201'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '11dc59a3-6dd7-4f81-b719-a1f98447ca2e'}), (w:Website {url: 'https://tatt.example.com/artists/f7c375a2-7024-4f46-9b83-0840daf44459'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '39da1ffe-73dc-4ac0-a22e-a9eda5ebdf31'}), (w:Website {url: 'https://tatt.example.com/artists/75369ae7-5c09-42a4-83ea-a1c81a432af1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'bd2cfcbb-faea-4215-92c8-c132bf8da238'}), (w:Website {url: 'https://tatt.example.com/artists/aad8ded2-d01d-4b8e-a378-b0e41bd5e889'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '4505d6e4-7924-4b4f-b842-e266de7a9a0b'}), (w:Website {url: 'https://tatt.example.com/artists/e98eb0d8-4337-4baa-ae12-5bfa85c0b219'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1d782048-86c4-44ad-b250-8d0e34d5561e'}), (w:Website {url: 'https://tatt.example.com/artists/5ea5a8ee-0233-4af7-83f0-4e74201328a1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7528da8e-5e08-4cf5-bbfc-4162ba4c1e57'}), (w:Website {url: 'https://tatt.example.com/artists/ea3f0b0e-5d3d-4d47-a3d7-9ee9d7d827c5'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f676d9fc-e893-4ff7-aed1-2725a03b7b69'}), (w:Website {url: 'https://tatt.example.com/artists/f174b88c-155f-4e71-9910-720e7fe33339'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'e4bc3fa9-df8b-476f-b489-48228a714fa2'}), (w:Website {url: 'https://tatt.example.com/artists/59d18bb3-eab9-4bad-aa87-c571325ea306'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3e41b67a-36ca-4486-a6c0-8ed471a24a9f'}), (w:Website {url: 'https://tatt.example.com/artists/3f46c9f5-885b-4cb8-b1e4-2b7654206b81'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1b9da0c9-ca52-43fb-8d45-446a80f3cf23'}), (w:Website {url: 'https://tatt.example.com/artists/f5953d06-51eb-4e88-b86a-08a5d58d2c43'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '772bbc78-e611-45ed-b252-c62c89a58184'}), (w:Website {url: 'https://tatt.example.com/artists/c7f77e33-924e-4960-a6b9-7a1e0b0d83cc'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a872ddeb-b14b-4205-88a7-2afd5774fff0'}), (w:Website {url: 'https://tatt.example.com/artists/457d61e8-007e-45bd-abaf-d035a9271607'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '56087216-8a98-4df8-a16c-4dbf99c94e9c'}), (w:Website {url: 'https://tatt.example.com/artists/9e7a47e3-86f8-4aff-baa2-50d3638478e6'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '26aae468-b0d2-41f7-b6f6-7380dd67a60c'}), (w:Website {url: 'https://tatt.example.com/artists/aa113bdf-a516-424f-aeea-15b4ac131491'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '794a7f8b-1904-48a5-b407-4b85b6613ed3'}), (w:Website {url: 'https://tatt.example.com/artists/10e25bd4-4ee4-4b4e-bdf4-7d62e57e8883'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1e61ba1e-046d-4044-9784-704d8cd4a725'}), (w:Website {url: 'https://tatt.example.com/artists/2cea32cc-caac-40a2-8679-7c5c7328abf3'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a83936a8-f6fe-4615-9030-b0fdebfc81a0'}), (w:Website {url: 'https://tatt.example.com/artists/cca11848-3d63-442a-8055-947949e39a2b'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '0b5aae9e-7115-4be6-a571-c8328a1117e7'}), (w:Website {url: 'https://tatt.example.com/artists/1cc34038-da24-49f5-b781-95ba2b3972e5'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a3ab9151-1259-483c-887a-388948f01cf8'}), (w:Website {url: 'https://tatt.example.com/artists/b0278e78-061f-4257-8ec9-f8950eab2497'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3edbc498-55b5-485d-81a7-2902da3f6893'}), (w:Website {url: 'https://tatt.example.com/artists/e67a1410-0ca6-4342-a5e3-6a31b5a785c5'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5c63871c-c87f-40d6-8eff-7582ffecb7ed'}), (w:Website {url: 'https://tatt.example.com/artists/99d2586e-08c4-4302-955f-246e7fcfdd2d'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '5ee83f4c-3812-422e-8969-e6f9d71d2d25'}), (w:Website {url: 'https://tatt.example.com/artists/9045c809-4eba-4233-81a1-7175804b8aba'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '85c8b8c3-91e1-4577-a4d6-36ba2338af44'}), (w:Website {url: 'https://tatt.example.com/artists/934b8d79-4dc4-46af-b2e9-2032be8898da'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c05fbe90-288a-4bc9-a099-b06f81ce2c92'}), (w:Website {url: 'https://tatt.example.com/artists/9a6f8382-33ca-43d8-b9c4-14cc140cbc5c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'a8984ae8-1699-4190-b367-6cd3134953d2'}), (w:Website {url: 'https://tatt.example.com/artists/87631753-e0dd-4d97-ba5f-b4404ac10425'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3000a0b8-e841-4a45-a7af-cdbc1ac555fd'}), (w:Website {url: 'https://tatt.example.com/artists/365d0d16-3446-43a8-bc2e-2703dea78bb0'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '546acb61-e7e5-43c0-9434-a53a0781c89a'}), (w:Website {url: 'https://tatt.example.com/artists/265bb8f2-e146-432c-99c5-c866bc0e2485'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'e2741d5d-76fd-4aa9-80ce-c895a4bc5726'}), (w:Website {url: 'https://tatt.example.com/artists/5f09911f-2e40-4223-82da-913c143a0d00'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'ef41eded-9b52-4124-8575-a2018ed200db'}), (w:Website {url: 'https://tatt.example.com/artists/c9448b0f-e0b0-47e2-bb68-7c27e40792e1'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f57663d2-7d36-4407-ab69-4ce308865e70'}), (w:Website {url: 'https://tatt.example.com/artists/b0b69619-da71-4271-9ef9-ced7ec2c1c62'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '52cfc283-3d3f-478f-8e69-5497c0a21240'}), (w:Website {url: 'https://tatt.example.com/artists/b6d8b52d-5d1e-46f5-a20c-0f58d716e79f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '3890674b-a870-4abb-b32e-b7cc18548349'}), (w:Website {url: 'https://tatt.example.com/artists/9f1f9f32-c699-4c24-b693-b737147539ea'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '7d1920ae-0df9-4727-b459-352346efd0bd'}), (w:Website {url: 'https://tatt.example.com/artists/f1a0e477-549a-431b-947c-0dfbcc618aca'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'ed91da3c-a198-45ad-97ed-b3160be1192d'}), (w:Website {url: 'https://tatt.example.com/artists/f23c0c71-2f55-4ec2-b889-4aca73c2f3ed'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '97db48a6-0c51-4c89-88f7-4b941569e0a9'}), (w:Website {url: 'https://tatt.example.com/artists/1df00960-e3e9-4885-a5c0-9272adb6d60e'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd12a0be6-78af-40cb-a398-f6f2d1df4baf'}), (w:Website {url: 'https://tatt.example.com/artists/1216d0b3-e46f-45ea-8c9f-03d9cafc5f5d'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '434098b1-bccd-49c8-b771-4683a861fcea'}), (w:Website {url: 'https://tatt.example.com/artists/77d49da9-1d3b-42a8-b526-02c1b0751da0'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '386bf3d6-f358-4738-9ddb-5079ebca7909'}), (w:Website {url: 'https://tatt.example.com/artists/e915aca8-e04c-4d57-be41-3e0922ed1012'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'fc8bcf0b-fb25-422f-877c-ac1c7a13d57d'}), (w:Website {url: 'https://tatt.example.com/artists/0b6e430d-5094-439d-a6f8-58325b7a0d5f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '8df11dfe-b26b-4299-82c9-269c9b3ad476'}), (w:Website {url: 'https://tatt.example.com/artists/206c9fb1-35fa-4690-b52a-632c42c04b83'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1e242c36-a916-4c94-ab2d-1265f74dd48b'}), (w:Website {url: 'https://tatt.example.com/artists/360d72d9-e52d-4ebb-b67c-d485fbb2cab4'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'f56e08f5-7a4c-4b77-95f6-1cdebcf1938f'}), (w:Website {url: 'https://tatt.example.com/artists/f1ef63d2-1b47-4a9f-8d61-f6098cce68f4'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c8f53513-6e40-43f0-9d0f-81fe16302e20'}), (w:Website {url: 'https://tatt.example.com/artists/6ff8257a-ce95-4cfb-90c1-c11abb968a5c'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '1371fabb-9b03-4bbe-810d-e9d9c92bbcd3'}), (w:Website {url: 'https://tatt.example.com/artists/878058d9-439c-4e59-adfe-b7441b632546'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'c30d7b12-4802-4ea3-8105-c4a45c013cea'}), (w:Website {url: 'https://tatt.example.com/artists/886dfcde-b319-4c11-bece-17d43d270649'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '8cf15fea-bb4f-42ba-9e13-aac5ad7df738'}), (w:Website {url: 'https://tatt.example.com/artists/d437cec3-d13e-4d42-939d-a33d4d6e335f'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '2510c2ea-ff53-4f3e-9c28-b456e5384fa6'}), (w:Website {url: 'https://tatt.example.com/artists/d4a3c029-bd91-43a4-abbd-7c07b9a82c21'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: 'd294198f-f290-4db6-904d-ee2ff4cf30a1'}), (w:Website {url: 'https://tatt.example.com/artists/e40cbb22-605d-4f19-9cd0-26a97cc73989'}) MERGE (a)-[:HAS_WEBSITE]->(w);
MATCH (a:Artist {id: '2c994788-0cd3-454a-b46b-5399baabff99'}), (w:Website {url: 'https://tatt.example.com/artists/f127017c-4e98-4315-b293-42d870bcb941'}) MERGE (a)-[:HAS_WEBSITE]->(w);

// Verification queries
MATCH (a:Artist) RETURN count(a) as artistCount;
MATCH (st:State) RETURN count(st) as stateCount;
MATCH (c:City) RETURN count(c) as cityCount;
MATCH (sh:Shop) RETURN count(sh) as shopCount;
MATCH (s:Style) RETURN count(s) as styleCount;
MATCH (w:Website) RETURN count(w) as websiteCount;
MATCH (st:State)-[r:HAS_CITY]->(:City) RETURN count(r) as hasCityCount;
MATCH (:City)-[r:HAS_SHOP]->(:Shop) RETURN count(r) as hasShopCount;
MATCH (:Shop)-[r:HAS_ARTIST]->(:Artist) RETURN count(r) as hasArtistCount;
MATCH (:Artist)-[r:SPECIALIZES_IN]->(:Style) RETURN count(r) as specializesInCount;
MATCH (:Shop)-[r:FEATURES_STYLE]->(:Style) RETURN count(r) as featuresStyleCount;
MATCH (:Artist)-[r:HAS_WEBSITE]->(:Website) RETURN count(r) as hasWebsiteCount;