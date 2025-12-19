/**
 * Character Enhancement Database - EXPANDED EDITION
 *
 * Centralized database of 250+ detailed character descriptions for AI tattoo generation.
 * Organized by series for easy expansion and maintenance.
 *
 * Structure:
 * - series: Anime/manga/game series name
 * - characters: Array of character objects
 *   - name: Primary character name (lowercase for matching)
 *   - aliases: Alternative names/spellings (optional)
 *   - description: Detailed visual description for AI generation
 *   - popularity: rough estimate for future prioritization (1-10)
 *
 * Usage:
 * - Import this database in councilService.js
 * - Easily add new series/characters without touching service logic
 * - Future: Convert to JSON file or database table for dynamic updates
 *
 * Total Characters: 250+
 * Last Updated: December 19, 2024
 */

const CHARACTER_DATABASE = {
  // ========================================
  // JUJUTSU KAISEN (15 characters)
  // ========================================
  'jujutsu-kaisen': {
    series: 'Jujutsu Kaisen',
    characters: [
      {
        name: 'gojo',
        aliases: ['satoru gojo', 'gojo satoru'],
        description: 'Satoru Gojo with white spiky hair, blindfold or dark sunglasses partially removed revealing luminous bright blue Six Eyes, infinity technique visualized as geometric patterns and distorted space around him, confident smirk, sleek black jujutsu uniform with high collar',
        popularity: 10
      },
      {
        name: 'sukuna',
        aliases: ['ryomen sukuna', 'king of curses'],
        description: 'Ryomen Sukuna with pink/salmon spiky hair, distinctive black facial tattoo markings on face and body, four muscular arms in true form, intense crimson/red eyes with malevolent gaze, sharp black fingernails, cursed energy radiating as dark purple and red aura, intimidating king of curses aesthetic with tribal-style markings across shoulders and torso',
        popularity: 10
      },
      {
        name: 'yuji',
        aliases: ['yuji itadori', 'itadori yuji', 'itadori'],
        description: 'Yuji Itadori with naturally pink/salmon spiky hair, athletic muscular build, red-hooded school uniform, black cursed energy glowing around clenched fists, determined fierce expression, Sukuna\'s markings appearing on face when possessed',
        popularity: 9
      },
      {
        name: 'megumi',
        aliases: ['megumi fushiguro', 'fushiguro megumi', 'fushiguro'],
        description: 'Megumi Fushiguro with dark spiky black hair styled upward, dark blue jujutsu uniform, hands forming shadow technique hand signs, divine dogs (black and white wolves) emerging from shadows, serious contemplative expression, sharp features',
        popularity: 8
      },
      {
        name: 'nobara',
        aliases: ['nobara kugisaki', 'kugisaki nobara', 'kugisaki'],
        description: 'Nobara Kugisaki with short orange-brown bob haircut, dark blue school uniform with skirt, hammer and nails for straw doll technique, confident fierce expression, cursed energy flowing through tools, determined fighting stance',
        popularity: 8
      },
      {
        name: 'toge',
        aliases: ['toge inumaki', 'inumaki toge', 'inumaki'],
        description: 'Toge Inumaki with platinum blonde/white hair, lower face covered by high collar showing serpent and fangs seal on tongue, violet eyes, zipped-up uniform collar, rice ball ingredients on cheeks as tattoo-like markings',
        popularity: 7
      },
      {
        name: 'maki',
        aliases: ['maki zenin', 'zenin maki'],
        description: 'Maki Zenin with short dark green hair tied back, glasses (later removed showing burn scars), muscular athletic build, wielding cursed tools like polearms and swords, jujutsu uniform modified for combat mobility, confident powerful stance',
        popularity: 7
      },
      {
        name: 'toji',
        aliases: ['toji fushiguro', 'toji zenin'],
        description: 'Toji Fushiguro with short black spiky hair, muscular scarred physique, tight black shirt showing muscles, scar on lip corner, wielding cursed tools and weapons from inventory curse, cold intimidating expression, assassin-like presence',
        popularity: 8
      },
      {
        name: 'geto',
        aliases: ['suguru geto', 'geto suguru'],
        description: 'Suguru Geto with long black hair tied in partial bun, monk-like robes with gojogesa garment, earrings, manipulating curse orbs in hands, charismatic but dark expression, curse spirits swirling around him',
        popularity: 7
      },
      {
        name: 'mahito',
        aliases: [],
        description: 'Mahito with patched-face appearance, heterochromatic eyes (one gray, one blue/green), light gray-blue hair, stitches across face and body, sadistic grin, cursed technique transforming human bodies, playful but terrifying demeanor',
        popularity: 7
      },
      {
        name: 'nanami',
        aliases: ['kento nanami', 'nanami kento'],
        description: 'Kento Nanami with blonde hair parted neatly, round sunglasses, formal tan suit with blue shirt and patterned tie, blunt sword wrapped in cloth, serious professional salaryman appearance, ratio technique marks highlighted',
        popularity: 8
      },
      {
        name: 'yuta',
        aliases: ['yuta okkotsu', 'okkotsu yuta'],
        description: 'Yuta Okkotsu with messy black hair, dark circles under eyes, katana sword, Rika (curse spirit) manifesting as giant monstrous form behind him, determined but haunted expression, white and black jujutsu uniform',
        popularity: 8
      },
      {
        name: 'todo',
        aliases: ['aoi todo', 'todo aoi'],
        description: 'Aoi Todo with tall muscular build, small black eyes, scar on left cheek, often shirtless showing muscular torso, confident wide grin, hands positioned for boogie woogie clapping technique',
        popularity: 6
      },
      {
        name: 'mai',
        aliases: ['mai zenin', 'zenin mai'],
        description: 'Mai Zenin with short dark green hair, sharp features similar to Maki, school uniform, wielding revolver constructed from cursed energy, confident but troubled expression',
        popularity: 5
      },
      {
        name: 'panda',
        aliases: [],
        description: 'Panda as sentient cursed corpse with large panda bear appearance, jujutsu school uniform adapted for his body, intelligent expressive eyes, multiple cores allowing form changes',
        popularity: 6
      }
    ]
  },

  // ========================================
  // DEMON SLAYER (18 characters)
  // ========================================
  'demon-slayer': {
    series: 'Demon Slayer',
    characters: [
      {
        name: 'tanjiro',
        aliases: ['tanjiro kamado', 'kamado tanjiro'],
        description: 'Tanjiro Kamado with burgundy red hair in ponytail, forehead scar that becomes flame-like demon mark, green and black checkered haori jacket, water breathing technique with flowing water effects around sword, kind determined expression, hanafuda earrings',
        popularity: 9
      },
      {
        name: 'nezuko',
        aliases: ['nezuko kamado', 'kamado nezuko'],
        description: 'Nezuko in demon form with bamboo muzzle across mouth, long black hair with flame-orange tips, pink kimono, pink eyes with slit pupils, veins appearing on face in demon state, blood demon art with pink flames, protective fierce expression',
        popularity: 10
      },
      {
        name: 'zenitsu',
        aliases: ['zenitsu agatsuma', 'agatsuma zenitsu'],
        description: 'Zenitsu Agatsuma with bright yellow-orange hair with bowl cut, yellow and orange gradient haori with triangle pattern, thunder breathing technique with golden lightning crackling around body and sword, eyes closed in sleeping state, anxious or fierce expression',
        popularity: 8
      },
      {
        name: 'inosuke',
        aliases: ['inosuke hashibira', 'hashibira inosuke'],
        description: 'Inosuke Hashibira with wild black-blue hair, boar head mask/helmet, shirtless showing muscular torso, dual serrated nichirin swords, beast breathing stance, aggressive wild expression, fur pelts around waist',
        popularity: 8
      },
      {
        name: 'rengoku',
        aliases: ['kyojuro rengoku', 'rengoku kyojuro', 'flame hashira'],
        description: 'Kyojuro Rengoku with bright yellow hair with red tips like flames standing upward, flame-patterned haori with yellow and red, wide enthusiastic smile, flame breathing with fire effects surrounding sword, intense fiery eyes, demon slayer uniform',
        popularity: 9
      },
      {
        name: 'tengen',
        aliases: ['tengen uzui', 'uzui tengen', 'sound hashira'],
        description: 'Tengen Uzui with white/silver hair, red eyes with dramatic makeup, muscular build with gems embedded in forehead, dual massive cleavers connected by chain, flashy sleeveless uniform showing arms, sound breathing with musical note effects, extravagant confident pose',
        popularity: 8
      },
      {
        name: 'giyu',
        aliases: ['giyu tomioka', 'tomioka giyu', 'water hashira'],
        description: 'Giyu Tomioka with messy black hair, half-and-half haori (red geometric pattern and green solid), calm stoic expression, water breathing technique with flowing water effects, dark blue demon slayer uniform, katana sword in disciplined stance',
        popularity: 8
      },
      {
        name: 'shinobu',
        aliases: ['shinobu kocho', 'kocho shinobu', 'insect hashira'],
        description: 'Shinobu Kocho with black to purple gradient hair in butterfly wing-styled buns, butterfly-patterned haori in purple and pink, small slender build, unique stinger-like sword for poison injection, insect breathing with butterfly effects, gentle smile masking intensity',
        popularity: 9
      },
      {
        name: 'muzan',
        aliases: ['muzan kibutsuji', 'kibutsuji muzan'],
        description: 'Muzan Kibutsuji with black wavy hair, red plum-colored eyes with vertical slit pupils, pale skin, black formal Western suit or white demon form with multiple mouths, blood manipulation tendrils, intimidating commanding presence, demon king aura',
        popularity: 9
      },
      {
        name: 'akaza',
        aliases: ['akaza upper moon 3'],
        description: 'Akaza with short bright pink spiky hair, yellow eyes with blue sclera, blue snowflake-like tattoo markings across entire body, muscular physique, martial arts fighting stance, destructive compass needle technique, upper moon kanji in eyes',
        popularity: 8
      },
      {
        name: 'doma',
        aliases: ['doma upper moon 2', 'douma'],
        description: 'Doma with spiky platinum blonde hair, rainbow-colored eyes, blood-stained golden fans with lotuses, ice-based blood demon art with frozen crystals, serene unsettling smile, upper moon kanji in eyes, cult leader aesthetic',
        popularity: 7
      },
      {
        name: 'kokushibo',
        aliases: ['kokushibo upper moon 1'],
        description: 'Kokushibo with long spiky black-purple hair in ponytail, six eyes arranged in three pairs, flame-like markings on face, samurai armor with purple and black, flesh-fused katana with multiple eyes, moon breathing technique, upper moon one kanji in eyes',
        popularity: 7
      },
      {
        name: 'gyomei',
        aliases: ['gyomei himejima', 'himejima gyomei', 'stone hashira'],
        description: 'Gyomei Himejima with massive muscular build, blind white eyes with tears running down, spiked flail and axe connected by chain, stone breathing technique, prayer beads around neck, bald head with scar on forehead, demon slayer uniform',
        popularity: 6
      },
      {
        name: 'mitsuri',
        aliases: ['mitsuri kanroji', 'kanroji mitsuri', 'love hashira'],
        description: 'Mitsuri Kanroji with long pink hair in braids with green tips, bright green eyes, pink and white uniform with short skirt, unique whip-like pink sword, love breathing with pink cherry blossom effects, heart-shaped face markings, cheerful expression',
        popularity: 8
      },
      {
        name: 'obanai',
        aliases: ['obanai iguro', 'iguro obanai', 'serpent hashira'],
        description: 'Obanai Iguro with black hair with teal tips, heterochromatic eyes (yellow and turquoise), mouth covered by bandages, white snake wrapped around shoulders, serpent breathing with snake-like movements, black and white striped haori',
        popularity: 6
      },
      {
        name: 'sanemi',
        aliases: ['sanemi shinazugawa', 'shinazugawa sanemi', 'wind hashira'],
        description: 'Sanemi Shinazugawa with spiky white hair, extensive scars across face and body, aggressive intense expression, wind breathing with green wind cyclones, muscular build, purple-gray uniform opened at chest, fierce fighting stance',
        popularity: 7
      },
      {
        name: 'muichiro',
        aliases: ['muichiro tokito', 'tokito muichiro', 'mist hashira'],
        description: 'Muichiro Tokito with long black hair fading to teal/cyan tips, mint-green eyes, young appearance, mist breathing with cloud and fog effects, oversized demon slayer uniform, distant dreamy expression',
        popularity: 7
      },
      {
        name: 'kanao',
        aliases: ['kanao tsuyuri', 'tsuyuri kanao'],
        description: 'Kanao Tsuyuri with black hair in side ponytail with butterfly clip, purple-pink gradient eyes, flower breathing technique with floral petal effects, butterfly mansion uniform, calm gentle expression, coin for decision-making',
        popularity: 6
      }
    ]
  },

  // ========================================
  // MY HERO ACADEMIA (15 characters)
  // ========================================
  'my-hero-academia': {
    series: 'My Hero Academia',
    characters: [
      {
        name: 'deku',
        aliases: ['izuku midoriya', 'midoriya izuku'],
        description: 'Izuku Midoriya with fluffy dark green hair, green eyes, hero costume with green bodysuit and red shoes, One For All green lightning crackling around body, Full Cowl energy aura, determined freckled face, multiple scars on arms',
        popularity: 9
      },
      {
        name: 'bakugo',
        aliases: ['katsuki bakugo', 'bakugo katsuki', 'dynamight'],
        description: 'Katsuki Bakugo with spiky ash-blonde hair, red eyes, aggressive expression, explosion quirk with orange and yellow blasts from palms, grenade-styled gauntlets, black and orange hero costume, muscular build, intense fierce look',
        popularity: 9
      },
      {
        name: 'todoroki',
        aliases: ['shoto todoroki', 'todoroki shoto', 'shouto'],
        description: 'Shoto Todoroki with half-white half-red split hair, heterochromatic eyes (gray and turquoise), burn scar over left eye, ice forming on right side and flames on left side, hero costume in white and dark blue, dual-quirk manifestation',
        popularity: 9
      },
      {
        name: 'all might',
        aliases: ['toshinori yagi', 'symbol of peace'],
        description: 'All Might in muscular hero form with blonde spiky hair standing up, blue eyes, bright smile, red white and blue costume, buff physique, Plus Ultra pose with fist raised, symbol of peace aura, yellow energy radiating',
        popularity: 9
      },
      {
        name: 'endeavor',
        aliases: ['enji todoroki', 'todoroki enji', 'flame hero'],
        description: 'Endeavor with red spiky hair and facial hair resembling flames, turquoise eyes, muscular build, dark blue bodysuit with orange flames, fire quirk with massive flames erupting from body, intense determined expression, number one hero',
        popularity: 7
      },
      {
        name: 'hawks',
        aliases: ['keigo takami', 'wing hero'],
        description: 'Hawks with blonde messy hair, golden-brown eyes with black markings, large red feathered wings, feathers floating around, yellow visor goggles, tan/beige jacket, laid-back confident expression, feather blades in motion',
        popularity: 8
      },
      {
        name: 'dabi',
        aliases: ['toya todoroki', 'blueflame'],
        description: 'Dabi with spiky black hair, purple scarred skin held by staples across face and body, turquoise blue flames, long black coat, multiple ear piercings, menacing grin, cremation quirk fire effects, villain aesthetic',
        popularity: 8
      },
      {
        name: 'shigaraki',
        aliases: ['tomura shigaraki', 'tenko shimura'],
        description: 'Tomura Shigaraki with pale blue-white hair, red eyes, hands grasping face (disintegrating mask), cracked dry skin, black outfit with red shoes, decay quirk disintegrating objects touched by five fingers, unsettling smile',
        popularity: 7
      },
      {
        name: 'toga',
        aliases: ['himiko toga'],
        description: 'Himiko Toga with blonde hair in messy buns, yellow cat-like eyes, fanged smile, school uniform with cardigan and skirt, blood vials and needles, blushing cheeks, yandere expression, blood quirk transformation effects',
        popularity: 7
      },
      {
        name: 'uraraka',
        aliases: ['ochaco uraraka', 'uravity'],
        description: 'Ochaco Uraraka with short brown bob haircut, large brown eyes, pink cheek marks, pink and white hero costume with black bodysuit, zero gravity quirk with pink glowing fingertips, floating objects around her, cheerful determined expression',
        popularity: 7
      },
      {
        name: 'kirishima',
        aliases: ['eijiro kirishima', 'red riot'],
        description: 'Eijiro Kirishima with bright red spiky hair styled upward, red eyes, sharp teeth smile, hardening quirk with rocky texture on skin, shirtless showing muscular torso or red hero costume with gears, manly determined pose',
        popularity: 6
      },
      {
        name: 'aizawa',
        aliases: ['shota aizawa', 'eraserhead'],
        description: 'Shota Aizawa with long black messy hair, tired eyes with dark circles, erasure quirk with red glowing eyes when active, black outfit with capture scarf/binding cloth flowing, stubble on face, serious expression',
        popularity: 7
      },
      {
        name: 'momo',
        aliases: ['momo yaoyorozu', 'creati'],
        description: 'Momo Yaoyorozu with long black hair in ponytail, red hero costume exposing midriff for creation quirk, intelligent confident expression, objects materializing from body, tall elegant posture',
        popularity: 6
      },
      {
        name: 'denki',
        aliases: ['denki kaminari', 'chargebolt'],
        description: 'Denki Kaminari with blonde hair with black lightning bolt streak, golden eyes, electrification quirk with yellow electricity sparking, black jacket with white lightning pattern, thumbs up pose, goofy short-circuited expression',
        popularity: 6
      },
      {
        name: 'mirko',
        aliases: ['rumi usagiyama', 'rabbit hero'],
        description: 'Mirko with white hair in long ponytail, red eyes, rabbit ears, dark skin, muscular athletic build, white sleeveless leotard, rabbit quirk with powerful leg muscles, fierce confident grin, combat action pose',
        popularity: 7
      }
    ]
  },

  // ========================================
  // ATTACK ON TITAN (12 characters)
  // ========================================
  'attack-on-titan': {
    series: 'Attack on Titan',
    characters: [
      {
        name: 'eren',
        aliases: ['eren yeager', 'eren jaeger'],
        description: 'Eren Yeager with brown hair in man bun or short, green intense eyes, Survey Corps uniform with green cloak, vertical maneuvering equipment, Attack Titan transformation with glowing eyes and muscular titan form, determined fierce expression, post-timeskip with longer hair and hardened look',
        popularity: 9
      },
      {
        name: 'levi',
        aliases: ['levi ackerman', 'captain levi'],
        description: 'Levi Ackerman with black undercut hair, gray eyes with dark circles, short stature but muscular build, Survey Corps uniform with cravat, dual blades in reverse grip, ODM gear in mid-air action, stoic intense expression, cleaning obsession subtle details',
        popularity: 10
      },
      {
        name: 'mikasa',
        aliases: ['mikasa ackerman'],
        description: 'Mikasa Ackerman with short black hair, gray eyes, red scarf wrapped around neck, Survey Corps uniform, ODM gear blades drawn, stoic protective expression, athletic muscular build, Ackerman combat prowess in motion',
        popularity: 9
      },
      {
        name: 'armin',
        aliases: ['armin arlert'],
        description: 'Armin Arlert with blonde short hair, large blue eyes, Survey Corps uniform, intelligent strategic expression, Colossal Titan transformation with explosive steam and massive size, gentle but determined look',
        popularity: 7
      },
      {
        name: 'reiner',
        aliases: ['reiner braun'],
        description: 'Reiner Braun with short blonde hair, gold eyes, muscular build, Survey Corps or Marleyan uniform, Armored Titan with white armored plating covering body, conflicted expression, warrior vs soldier duality',
        popularity: 7
      },
      {
        name: 'annie',
        aliases: ['annie leonhart'],
        description: 'Annie Leonhart with blonde hair in bun, blue eyes, stoic expression, Female Titan with feminine features and crystallization hardening, martial arts stance, Survey Corps or crystal prison imagery',
        popularity: 7
      },
      {
        name: 'zeke',
        aliases: ['zeke yeager', 'zeke jaeger', 'beast titan'],
        description: 'Zeke Yeager with blonde hair and beard, glasses, Marleyan uniform, Beast Titan with ape-like features and throwing rocks, royal blood abilities, calculating intelligent expression',
        popularity: 7
      },
      {
        name: 'erwin',
        aliases: ['erwin smith', 'commander erwin'],
        description: 'Erwin Smith with blonde slicked-back hair, thick eyebrows, Survey Corps commander uniform with bolo tie, missing right arm, horse-riding leadership pose, determined sacrificial expression, "Dedicate your hearts" moment',
        popularity: 8
      },
      {
        name: 'hange',
        aliases: ['hange zoe', 'hanji zoe'],
        description: 'Hange Zoe with brown messy hair in ponytail, glasses, Survey Corps uniform, titan research equipment, energetic eccentric expression, later eye patch after injury, intellectual curiosity visible',
        popularity: 7
      },
      {
        name: 'sasha',
        aliases: ['sasha braus', 'potato girl'],
        description: 'Sasha Braus with brown hair in ponytail, Survey Corps uniform, bow and arrows, eating food (potato or meat), cheerful expression, hunter background aesthetic',
        popularity: 6
      },
      {
        name: 'historia',
        aliases: ['historia reiss', 'christa lenz'],
        description: 'Historia Reiss with blonde hair, blue eyes, royal dress or Survey Corps uniform, queen crown, kind gentle expression hiding inner strength, Founding Titan royal bloodline imagery',
        popularity: 6
      },
      {
        name: 'ymir',
        aliases: ['ymir fritz', 'founder ymir'],
        description: 'Ymir Fritz with long blonde hair, ancient Eldian dress, Founding Titan with ribcage and spine visible, paths realm with glowing tree, tragic enslaved expression, coordinate power visualization',
        popularity: 6
      }
    ]
  },

  // ========================================
  // CHAINSAW MAN (10 characters)
  // ========================================
  'chainsaw-man': {
    series: 'Chainsaw Man',
    characters: [
      {
        name: 'denji',
        aliases: ['chainsaw man'],
        description: 'Denji with messy blonde hair, sharp teeth, chainsaws emerging from head and arms in devil form, orange pullcord from chest, blood splatter, Public Safety uniform or casual clothes, wild feral expression, chainsaw devil transformation',
        popularity: 9
      },
      {
        name: 'power',
        aliases: [],
        description: 'Power with long blonde-pink hair, red-yellow eyes with cross-shaped pupils, devil horns protruding from head, fanged grin, white shirt with blood splatter, blood manipulation creating weapons, chaotic confident expression',
        popularity: 9
      },
      {
        name: 'makima',
        aliases: ['control devil'],
        description: 'Makima with long red-orange hair in braid, golden-yellow ringed eyes, white shirt with black tie, calm controlling smile, chains and finger-pointing control abilities, mysterious dangerous aura, professional appearance masking devil nature',
        popularity: 9
      },
      {
        name: 'aki',
        aliases: ['aki hayakawa'],
        description: 'Aki Hayakawa with black hair in topknot, blue eyes, Public Safety devil hunter suit, fox devil contract hand gesture, cursed nail sword, smoking cigarette, serious stoic expression, tragic determination',
        popularity: 8
      },
      {
        name: 'kobeni',
        aliases: ['kobeni higashiyama'],
        description: 'Kobeni Higashiyama with short black hair, nervous anxious expression, Public Safety uniform, knife-wielding combat stance despite fear, timid but surprisingly skilled, teary-eyed panicked look',
        popularity: 6
      },
      {
        name: 'reze',
        aliases: ['bomb devil', 'lady reze'],
        description: 'Reze with short purple-black hair, green eyes, cafe uniform or bomb devil form with fuses as hair, explosive abilities, kind exterior hiding assassin nature, conflicted expression',
        popularity: 7
      },
      {
        name: 'quanxi',
        aliases: ['first devil hunter'],
        description: 'Quanxi with white hair in braid, eye patch over one eye, sword-wielding hybrid devil form, Chinese-style clothing, surrounded by fiend girlfriends, calm expert fighter aesthetic',
        popularity: 6
      },
      {
        name: 'angel devil',
        aliases: ['angel'],
        description: 'Angel Devil with shoulder-length red hair, androgynous appearance, white wings, halo above head, Public Safety uniform, life-absorbing touch ability, lazy apathetic expression',
        popularity: 6
      },
      {
        name: 'beam',
        aliases: ['shark fiend'],
        description: 'Beam with shark head featuring sharp teeth and gills, human body in Public Safety uniform, loyal enthusiastic expression, swimming through solid matter, devoted to Denji',
        popularity: 5
      },
      {
        name: 'violence',
        aliases: ['violence fiend'],
        description: 'Violence Fiend with poison mask covering face, muscular build, Public Safety uniform, calm gentle personality despite violent name, protective stance',
        popularity: 5
      }
    ]
  },

  // ========================================
  // BLEACH (12 characters)
  // ========================================
  'bleach': {
    series: 'Bleach',
    characters: [
      {
        name: 'ichigo',
        aliases: ['ichigo kurosaki'],
        description: 'Ichigo Kurosaki with spiky orange hair, brown eyes, black shinigami robes or Bankai outfit with long black coat, oversized cleaver-like Zanpakuto sword, hollow mask with red stripes, determined fierce expression, spiritual energy aura',
        popularity: 9
      },
      {
        name: 'rukia',
        aliases: ['rukia kuchiki'],
        description: 'Rukia Kuchiki with short black hair, violet eyes, black shinigami robes or white Bankai with ice and snow, Sode no Shirayuki ice-type sword, graceful stance, noble Kuchiki clan aesthetic',
        popularity: 8
      },
      {
        name: 'grimmjow',
        aliases: ['grimmjow jaegerjaquez'],
        description: 'Grimmjow Jaegerjaquez with light blue spiky hair, blue eyes, Espada uniform with number 6 tattoo, panther-like Resurreccion form with claws and tail, aggressive feral grin, teal spiritual pressure',
        popularity: 8
      },
      {
        name: 'aizen',
        aliases: ['sosuke aizen'],
        description: 'Sosuke Aizen with brown slicked-back hair, brown eyes, glasses (early) or butterfly-like Hogyoku transformation (later), white captain haori or godlike form, Kyoka Suigetsu sword, calm manipulative smile, overwhelming spiritual pressure',
        popularity: 8
      },
      {
        name: 'byakuya',
        aliases: ['byakuya kuchiki'],
        description: 'Byakuya Kuchiki with long black hair in ponytail with decorative hairpieces, gray eyes, white scarf, captain haori, Senbonzakura cherry blossom blade petals swirling, noble stoic expression, Kuchiki clan elegance',
        popularity: 7
      },
      {
        name: 'renji',
        aliases: ['renji abarai'],
        description: 'Renji Abarai with long spiky red hair in ponytail, brown eyes, tribal tattoos on forehead and body, Zabimaru segmented blade serpent, Bankai with giant skeletal snake, fierce determined expression',
        popularity: 7
      },
      {
        name: 'ulquiorra',
        aliases: ['ulquiorra cifer'],
        description: 'Ulquiorra Cifer with short black hair, green eyes with tear markings, pale skin, Espada uniform with number 4, bat-like wings in Resurreccion, emotionless nihilistic expression, black and green spiritual energy',
        popularity: 8
      },
      {
        name: 'toshiro',
        aliases: ['toshiro hitsugaya', 'hitsugaya'],
        description: 'Toshiro Hitsugaya with spiky white hair, teal eyes, short stature, captain haori, Hyorinmaru ice dragon Zanpakuto, ice wings in Bankai form, mature serious expression despite youth',
        popularity: 7
      },
      {
        name: 'kenpachi',
        aliases: ['kenpachi zaraki', 'zaraki'],
        description: 'Kenpachi Zaraki with black spiky hair with bells, eye patch covering one eye, massive jagged Zanpakuto, heavily scarred muscular body, captain haori torn and ragged, bloodthirsty battle-hungry grin',
        popularity: 7
      },
      {
        name: 'yoruichi',
        aliases: ['yoruichi shihoin'],
        description: 'Yoruichi Shihoin with purple hair in ponytail, golden eyes, dark skin, black bodysuit or Shunko lightning aura form, cat transformation ability, agile combat pose, confident teasing expression',
        popularity: 7
      },
      {
        name: 'kisuke',
        aliases: ['kisuke urahara', 'urahara'],
        description: 'Kisuke Urahara with messy blonde hair, green striped bucket hat, gray eyes, wooden geta sandals, green coat over black shinigami robes, cane sword Benihime, playful mysterious expression',
        popularity: 6
      },
      {
        name: 'orihime',
        aliases: ['orihime inoue'],
        description: 'Orihime Inoue with long orange hair, gray eyes, curvy figure, white and blue outfit or school uniform, Shun Shun Rikka fairy-like spirits around her, kind gentle healing pose, hair clips',
        popularity: 6
      }
    ]
  },

  // ========================================
  // DRAGON BALL (Expanded - 15 characters)
  // ========================================
  'dragon-ball': {
    series: 'Dragon Ball',
    characters: [
      {
        name: 'goku',
        aliases: ['son goku', 'kakarot'],
        description: 'Goku with wild spiky black hair (or golden Super Saiyan), orange gi with blue undershirt and belt, confident fighting stance, muscular build, power aura glowing, excited battle-ready expression, Nimbus cloud or Kamehameha energy blast',
        popularity: 10
      },
      {
        name: 'vegeta',
        aliases: ['prince vegeta'],
        description: 'Vegeta with distinctive widow\'s peak spiky hair (black or Super Saiyan gold), Saiyan armor with white and gold or blue training suit, arms crossed in proud stance, intense serious expression, Saiyan prince aura',
        popularity: 9
      },
      {
        name: 'shenron',
        aliases: ['eternal dragon'],
        description: 'Shenron the eternal dragon with flowing serpentine body coiling through clouds, antler-like branching horns, glowing red eyes with power, emerald green scales with golden and yellow highlights, whiskers, majestic intimidating presence, seven dragon balls scattered',
        popularity: 8
      },
      {
        name: 'gohan',
        aliases: ['son gohan'],
        description: 'Gohan with black spiky hair, gi similar to Goku in orange and blue or Great Saiyaman outfit, scholarly glasses or Super Saiyan transformation, focused determined expression, hidden power aura, Mystic/Ultimate form',
        popularity: 7
      },
      {
        name: 'trunks',
        aliases: ['future trunks'],
        description: 'Trunks with purple/lavender hair in various styles, sword strapped to back, Capsule Corp jacket or Saiyan armor, blue eyes, Super Saiyan transformation, time machine or futuristic aesthetic, serious warrior expression',
        popularity: 7
      },
      {
        name: 'frieza',
        aliases: ['freezer'],
        description: 'Frieza with white and purple segmented body armor, long tail, red eyes, bio-armor on shoulders and head, energy finger beams, final form sleek white appearance or golden form, sadistic smirk, space tyrant aura',
        popularity: 8
      },
      {
        name: 'cell',
        aliases: ['perfect cell'],
        description: 'Cell in perfect form with black and green spotted bio-armor, orange eyes, Piccolo-like antennae, tail stinger, wings on back, muscular humanoid android body, confident smug expression, kamehameha charging',
        popularity: 7
      },
      {
        name: 'majin buu',
        aliases: ['buu'],
        description: 'Majin Buu with pink blob-like body, childlike fat form or muscular evil form, steam vents on head, white pants and cape, antennae on head, candy beam or absorption ability, playful or menacing expression',
        popularity: 7
      },
      {
        name: 'piccolo',
        aliases: [],
        description: 'Piccolo with green Namekian skin, pointed ears, antennae on forehead, purple gi with weighted cape and turban, muscular build, arms crossed or special beam cannon charging, serious mentor expression',
        popularity: 7
      },
      {
        name: 'broly',
        aliases: ['legendary super saiyan'],
        description: 'Broly with massive muscular build, spiky black hair (base) or flowing golden-green hair (Legendary Super Saiyan), green power aura, Saiyan armor torn from muscle expansion, berserker rage expression, overwhelming energy',
        popularity: 8
      },
      {
        name: 'krillin',
        aliases: [],
        description: 'Krillin with bald head and six dot monk marks, orange gi, small muscular build, destructo disc energy attack, determined underdog expression, Z fighter stance',
        popularity: 6
      },
      {
        name: 'android 18',
        aliases: [],
        description: 'Android 18 with short blonde hair, blue eyes, denim vest and skirt, stoic beautiful expression, infinite energy aura, confident fighter pose, cool demeanor',
        popularity: 7
      },
      {
        name: 'beerus',
        aliases: ['god of destruction'],
        description: 'Beerus with purple cat-like appearance, large pointed ears, Egyptian god aesthetic with ornate collar and clothing, destructive energy aura, bored or annoyed expression, godly presence',
        popularity: 7
      },
      {
        name: 'whis',
        aliases: [],
        description: 'Whis with blue skin, white hair in ponytail, Egyptian-styled staff with glowing orb, angelic robes in purple and white, calm serene expression, angel attendant aesthetic, godly graceful pose',
        popularity: 6
      },
      {
        name: 'bardock',
        aliases: [],
        description: 'Bardock with wild spiky black hair with signature red bandana/headband, Saiyan armor, scouter over one eye, muscular Saiyan warrior, fierce determined expression, energy blast, father of Goku aesthetic',
        popularity: 7
      }
    ]
  },

  // ========================================
  // NARUTO (Expanded - 20 characters)
  // ========================================
  'naruto': {
    series: 'Naruto',
    characters: [
      {
        name: 'naruto',
        aliases: ['naruto uzumaki', 'seventh hokage'],
        description: 'Naruto Uzumaki with spiky bright blonde hair, blue eyes, orange and black jumpsuit or Hokage cloak, whisker marks on cheeks, rasengan glowing blue sphere in hand, Nine-Tails chakra cloak with fox features, determined grinning expression',
        popularity: 10
      },
      {
        name: 'sasuke',
        aliases: ['sasuke uchiha'],
        description: 'Sasuke Uchiha with dark spiky black hair, Sharingan red eyes with tomoe or Rinnegan purple eyes, white or dark blue outfit, lightning blade chidori crackling in hand, Kusanagi sword, serious brooding expression, Uchiha clan symbol',
        popularity: 9
      },
      {
        name: 'kakashi',
        aliases: ['kakashi hatake', 'copy ninja'],
        description: 'Kakashi Hatake with gravity-defying silver spiky hair, mask covering lower face, Sharingan eye visible or covered, jonin vest, reading orange book, lightning blade technique, calm laid-back expression',
        popularity: 8
      },
      {
        name: 'itachi',
        aliases: ['itachi uchiha'],
        description: 'Itachi Uchiha with long black hair in low ponytail, Mangekyou Sharingan active with pinwheel pattern, Akatsuki black cloak with red clouds, lines under eyes from illness, crow summons, stoic tragic expression, Amaterasu black flames',
        popularity: 9
      },
      {
        name: 'madara',
        aliases: ['madara uchiha'],
        description: 'Madara Uchiha with long spiky black hair, Rinnegan purple eyes with ripple pattern, red samurai armor or Akatsuki cloak, gunbai war fan, Susanoo ribcage armor manifestation, confident god-like expression, Uchiha legend aesthetic',
        popularity: 9
      },
      {
        name: 'pain',
        aliases: ['nagato', 'yahiko'],
        description: 'Pain/Nagato with orange spiky hair, multiple Rinnegan eyes with piercings throughout face and body, black Akatsuki cloak with red clouds, chakra rods/receivers, Shinra Tensei gravity manipulation, godly almighty push pose',
        popularity: 8
      },
      {
        name: 'obito',
        aliases: ['tobi', 'masked man'],
        description: 'Obito Uchiha with black spiky hair, orange spiral mask or half-scarred face, Sharingan and Rinnegan eyes, black Akatsuki cloak, Kamui space-time distortion effects, chains and fan weapon, tragic villain expression',
        popularity: 8
      },
      {
        name: 'minato',
        aliases: ['minato namikaze', 'fourth hokage', 'yellow flash'],
        description: 'Minato Namikaze with spiky blonde hair, blue eyes, white and red Hokage cloak with flames, kunai with teleportation seal tags, rasengan, Flying Thunder God technique, kind heroic smile, legendary speed aura',
        popularity: 8
      },
      {
        name: 'jiraiya',
        aliases: ['pervy sage', 'toad sage'],
        description: 'Jiraiya with long spiky white hair, red kabuki lines on face, headband with "oil" kanji, scroll on back, toad summoning, Sage Mode with orange eye markings, writing notebook, confident goofy grin',
        popularity: 8
      },
      {
        name: 'tsunade',
        aliases: ['fifth hokage', 'slug princess'],
        description: 'Tsunade with long blonde hair in twin ponytails, green haori jacket over gray kimono-style top, purple diamond seal on forehead, medical ninjutsu glowing hands, superhuman strength punch, mature confident expression',
        popularity: 7
      },
      {
        name: 'orochimaru',
        aliases: [],
        description: 'Orochimaru with pale skin, long black hair, yellow snake-like eyes with purple markings, snake summoning jutsu, tongue extended, sinister grin, reanimation jutsu, purple rope belt, villainous scientific aesthetic',
        popularity: 7
      },
      {
        name: 'gaara',
        aliases: ['gaara of the sand'],
        description: 'Gaara with short red hair, black rings around teal eyes, red "love" kanji tattoo on forehead, gourd of sand on back, sand manipulation swirling, Kazekage robes, calm protective expression',
        popularity: 8
      },
      {
        name: 'rock lee',
        aliases: [],
        description: 'Rock Lee with bowl-cut black hair, large round eyes with thick eyebrows, green jumpsuit with orange leg warmers, taijutsu fighting stance, Eight Gates chakra aura, bandaged hands and arms, determined enthusiastic expression',
        popularity: 7
      },
      {
        name: 'neji',
        aliases: ['neji hyuga'],
        description: 'Neji Hyuga with long black hair, Byakugan white pupiless eyes with veins, curse mark seal on forehead, gentle fist palm strike stance, rotation technique, Hyuga clan elegant fighting style',
        popularity: 7
      },
      {
        name: 'hinata',
        aliases: ['hinata hyuga'],
        description: 'Hinata Hyuga with long dark blue hair, Byakugan lavender-white eyes, shy but determined expression, gentle fist stance, white and lavender jacket, protective loving aura, Hyuga clan heiress',
        popularity: 7
      },
      {
        name: 'shikamaru',
        aliases: ['shikamaru nara'],
        description: 'Shikamaru Nara with black hair in spiky ponytail, lazy expression, shadow possession jutsu with dark tendrils, hands in thinking pose, cigarette smoking (later), strategic intelligent aura, cloud-watching',
        popularity: 7
      },
      {
        name: 'sakura',
        aliases: ['sakura haruno'],
        description: 'Sakura Haruno with pink hair (short or long), green eyes, red qipao dress or jonin outfit, medical ninjutsu glowing green hands, superhuman strength punch cratering ground, confident determined expression',
        popularity: 7
      },
      {
        name: 'might guy',
        aliases: ['might gai'],
        description: 'Might Guy with bowl-cut black hair, thick eyebrows, green jumpsuit with orange leg warmers, nice guy pose with thumbs up and teeth gleaming, Eight Gates aura with red chakra, passionate energetic expression',
        popularity: 7
      },
      {
        name: 'kisame',
        aliases: ['kisame hoshigaki'],
        description: 'Kisame Hoshigaki with blue shark-like skin, small eyes, gill marks on face, Akatsuki cloak, Samehada sword wrapped in bandages, shark summons in water, sharp teeth grin, mist ninja aesthetic',
        popularity: 6
      },
      {
        name: 'deidara',
        aliases: [],
        description: 'Deidara with long blonde hair partially covering one eye, scope over left eye, mouths on palms creating clay explosives, Akatsuki cloak, riding clay bird, artistic explosion aesthetic, confident smirk',
        popularity: 6
      }
    ]
  },

  // ========================================
  // ONE PIECE (Expanded - 20 characters)
  // ========================================
  'one-piece': {
    series: 'One Piece',
    characters: [
      {
        name: 'luffy',
        aliases: ['monkey d luffy', 'monkey d. luffy', 'straw hat'],
        description: 'Monkey D. Luffy with black messy hair, straw hat with red ribbon, red vest/cardigan open showing chest scar, denim shorts, rubber stretching arms in Gear transformations, bright grin with missing tooth, Gear Fourth muscular steam form',
        popularity: 10
      },
      {
        name: 'zoro',
        aliases: ['roronoa zoro'],
        description: 'Roronoa Zoro with short green/moss hair, three earrings in left ear, scar over left eye (closed), three swords (Wado Ichimonji, Sandai Kitetsu, Enma), muscular build, green haramaki belly band, bandana for serious fights, santoryu stance',
        popularity: 9
      },
      {
        name: 'sanji',
        aliases: ['vinsmoke sanji', 'black leg'],
        description: 'Sanji with blonde hair covering one eye (swirl eyebrow), black suit with tie, cigarette in mouth, leg raised in powerful kick with flames (Diable Jambe), heart eyes around women, cool gentleman aesthetic',
        popularity: 8
      },
      {
        name: 'nami',
        aliases: ['cat burglar nami'],
        description: 'Nami with long orange hair, brown eyes, bikini top and jeans or navigator outfit, Clima-Tact staff creating weather effects, tattoo on left shoulder (pinwheel and tangerine), navigational charts and maps, confident sly expression',
        popularity: 8
      },
      {
        name: 'nico robin',
        aliases: ['robin'],
        description: 'Nico Robin with long black hair, blue eyes, cowboy hat or sunglasses, purple or black outfits, Hana Hana no Mi hands sprouting from surfaces, calm intellectual expression, archaeologist aesthetic with books',
        popularity: 8
      },
      {
        name: 'chopper',
        aliases: ['tony tony chopper'],
        description: 'Tony Tony Chopper as small reindeer with pink hat with white cross, blue nose, cute chibi form or monster point transformation, doctor bag, adorable or fierce expressions, Straw Hat Pirates doctor',
        popularity: 7
      },
      {
        name: 'franky',
        aliases: ['cutty flam'],
        description: 'Franky with blue pompadour hair, sunglasses, cyborg body with mechanical arms, star tattoos on forearms, Hawaiian shirt or speedo, "SUPER" pose with arms, cola fuel bottles, shipwright tools',
        popularity: 7
      },
      {
        name: 'brook',
        aliases: ['soul king'],
        description: 'Brook as living skeleton with afro hairstyle, top hat, gentleman suit with cane sword, musician with violin or guitar, "Yohohoho" laughter, soul king performer outfit with crown, bone jokes aesthetic',
        popularity: 7
      },
      {
        name: 'shanks',
        aliases: ['red hair shanks'],
        description: 'Shanks with red hair, three scars over left eye, black cloak, missing left arm, Gryphon sword, Emperor/Yonko commanding presence, straw hat imagery (given to Luffy), confident charismatic smile',
        popularity: 9
      },
      {
        name: 'law',
        aliases: ['trafalgar law', 'trafalgar d water law'],
        description: 'Trafalgar Law with black spiky hair, tribal tattoos on arms and chest, white spotted hat with leopard pattern, long black coat with yellow, Kikoku nodachi sword, ROOM technique sphere, death surgeon aesthetic, cool calculating expression',
        popularity: 9
      },
      {
        name: 'ace',
        aliases: ['portgas d ace', 'fire fist ace'],
        description: 'Portgas D. Ace with black wavy hair, orange cowboy hat with blue skulls, shirtless showing Whitebeard tattoo and ASCE arm tattoo, orange shorts, fire fist flames, confident smile, tragic hero aura',
        popularity: 8
      },
      {
        name: 'sabo',
        aliases: [],
        description: 'Sabo with blonde hair, burn scar over left eye, blue coat with cravat, top hat with goggles, pipe weapon, Flame-Flame Fruit fire abilities, Revolutionary Army aesthetic, noble turned revolutionary',
        popularity: 7
      },
      {
        name: 'boa hancock',
        aliases: ['pirate empress'],
        description: 'Boa Hancock with long black hair, red rose in hair, tall beautiful figure, qipao dress with cape, snake earrings, Love-Love Fruit turning people to stone, Kuja Pirates, haughty empress expression turning loving around Luffy',
        popularity: 7
      },
      {
        name: 'doflamingo',
        aliases: ['donquixote doflamingo', 'joker'],
        description: 'Donquixote Doflamingo with blonde hair in spiky style, pink feather coat, red sunglasses never removed, white pants, string-string fruit with puppet control strings, flamingo aesthetic, sadistic grin',
        popularity: 7
      },
      {
        name: 'crocodile',
        aliases: ['sir crocodile'],
        description: 'Crocodile with slicked-back black hair, long horizontal scar across face, fur coat, gold hook replacing left hand, cigar smoking, sand-sand fruit desert powers, mafia boss aesthetic, confident villainous smirk',
        popularity: 7
      },
      {
        name: 'katakuri',
        aliases: ['charlotte katakuri'],
        description: 'Charlotte Katakuri with short spiky crimson hair, black tattoos on arms, massive muscular build, scarf covering mouth with sharp teeth, Mogura trident, mochi-mochi fruit sticky powers, future sight observation haki, cool composed fighter',
        popularity: 7
      },
      {
        name: 'whitebeard',
        aliases: ['edward newgate'],
        description: 'Edward Newgate "Whitebeard" with blonde hair and distinctive white crescent-shaped mustache, bisento polearm weapon, white coat draped on shoulders, Gura Gura no Mi earthquake powers with cracked air, strongest man presence, father figure to crew',
        popularity: 8
      },
      {
        name: 'kaido',
        aliases: ['kaido of the beasts'],
        description: 'Kaido with long black hair and horns, massive muscular body covered in dragon scale tattoo, kanabo spiked club, Azure Dragon transformation, Thunder Bagua attack, Emperor/Yonko overwhelming presence, strongest creature alive',
        popularity: 8
      },
      {
        name: 'big mom',
        aliases: ['charlotte linlin'],
        description: 'Charlotte Linlin "Big Mom" with pink hair in distinctive style, polka dot dress, Napoleon bicorne hat (living homie), Prometheus sun and Zeus cloud, soul-soul fruit powers, massive intimidating presence, childlike rage expression',
        popularity: 6
      },
      {
        name: 'blackbeard',
        aliases: ['marshall d teach'],
        description: 'Marshall D. Teach "Blackbeard" with long black hair and scraggly beard, missing teeth, pirate captain coat, multiple rings, darkness-darkness fruit black hole powers and tremor-tremor fruit earthquakes, chaotic ambitious laugh, dual devil fruit user',
        popularity: 7
      }
    ]
  },

  // ========================================
  // HUNTER X HUNTER (Expanded - 10 characters)
  // ========================================
  'hunter-x-hunter': {
    series: 'Hunter x Hunter',
    characters: [
      {
        name: 'gon',
        aliases: ['gon freecss'],
        description: 'Gon Freecss with spiky black hair with green highlights, large innocent brown eyes, green jacket with white sleeves, capri shorts, fishing rod weapon, Jajanken rock-paper-scissors nen ability, determined cheerful expression, adult transformation with long black hair',
        popularity: 9
      },
      {
        name: 'killua',
        aliases: ['killua zoldyck'],
        description: 'Killua Zoldyck with spiky silver/white hair, sharp blue eyes, hands crackling with lightning (Godspeed), yo-yos as weapons, assassin clawed fingers, skateboard, electric Nen aura, confident mischievous expression',
        popularity: 9
      },
      {
        name: 'hisoka',
        aliases: [],
        description: 'Hisoka with slicked-back bright red/magenta hair, yellow eyes, face paint with star on forehead and teardrop under eye, jester/magician outfit, playing cards floating, bungee gum and texture surprise, sinister aroused grin, creepy fighting pose',
        popularity: 8
      },
      {
        name: 'kurapika',
        aliases: [],
        description: 'Kurapika with blonde hair, gray eyes turning scarlet when emotional, Kurta clan traditional outfit or suit, chains wrapped around hand (Holy Chain, Chain Jail), vengeful focused expression, eyes glowing red with rage',
        popularity: 7
      },
      {
        name: 'leorio',
        aliases: [],
        description: 'Leorio in dark business suit with white shirt, sunglasses, rectangular glasses, briefcase in hand, emission-type punch ability, tall confident build, determined doctor-in-training aesthetic',
        popularity: 6
      },
      {
        name: 'meruem',
        aliases: ['chimera ant king'],
        description: 'Meruem with humanoid ant features, segmented tail with stinger, purple and green exoskeleton body, muscular build, en aura visualization, Gungi board game, evolution from ruthless to enlightened, regal powerful presence',
        popularity: 8
      },
      {
        name: 'netero',
        aliases: ['isaac netero', 'chairman netero'],
        description: 'Isaac Netero with bald head, long white beard in ponytail, prayer hands pose, muscular elderly physique, 100-Type Guanyin Bodhisattva manifestation, hunter association chairman robes, wise powerful smile',
        popularity: 7
      },
      {
        name: 'chrollo',
        aliases: ['chrollo lucilfer'],
        description: 'Chrollo Lucilfer with slicked-back black hair, pale skin, inverted cross on forehead, dark coat with fur collar, Phantom Troupe spider tattoo, skill hunter book in hand, calm calculating expression, thief aesthetic',
        popularity: 8
      },
      {
        name: 'feitan',
        aliases: [],
        description: 'Feitan with black hair covering one eye, mask or bandana covering mouth, dark outfit with torture tools, small stature but deadly, Pain Packer Rising Sun technique, Phantom Troupe spider tattoo, sadistic fighter',
        popularity: 6
      },
      {
        name: 'illumi',
        aliases: ['illumi zoldyck'],
        description: 'Illumi Zoldyck with very long black hair, large expressionless black eyes, pale skin, pins/needles through face and body for manipulation, emotionless blank stare, assassin aesthetic, disturbing calm presence',
        popularity: 7
      }
    ]
  },

  // ========================================
  // SOLO LEVELING (Expanded - 8 characters)
  // ========================================
  'solo-leveling': {
    series: 'Solo Leveling',
    characters: [
      {
        name: 'sung jinwoo',
        aliases: ['jinwoo', 'jin woo', 'shadow monarch'],
        description: 'Sung Jinwoo with glowing purple eyes, black spiky hair, dark armor materializing from shadows, shadow soldiers emerging behind him as dark army, dual daggers or knight killer sword, system interface panels, leveling up aura, confident powerful stance',
        popularity: 10
      },
      {
        name: 'igris',
        aliases: ['shadow igris'],
        description: 'Igris as shadow knight in full black armor with glowing purple accents, holding longsword and shield, red flowing cape, loyal kneeling or combat stance, flame-like shadow aura',
        popularity: 7
      },
      {
        name: 'beru',
        aliases: [],
        description: 'Beru as ant shadow soldier with humanoid ant features, claws and mandibles, black exoskeleton with purple glow, respectful servant pose or fierce combat stance, shadow monarch\'s general',
        popularity: 7
      },
      {
        name: 'iron',
        aliases: [],
        description: 'Iron as massive shadow knight with heavy armor and great sword, towering presence, purple shadow energy, tank-like defensive stance',
        popularity: 5
      },
      {
        name: 'cha hae-in',
        aliases: ['cha haein'],
        description: 'Cha Hae-In with gray/blonde hair, red eyes, S-rank hunter armor, rapier sword, elegant fighting stance, strong female hunter aesthetic',
        popularity: 7
      },
      {
        name: 'go gunhee',
        aliases: [],
        description: 'Go Gunhee as elderly chairman with white hair, Korean Hunter Association suit, wise powerful presence despite age, protective of hunters',
        popularity: 5
      },
      {
        name: 'thomas andre',
        aliases: [],
        description: 'Thomas Andre with massive muscular build, blonde hair, tank top showing muscles, goliath-like presence, American S-rank hunter, confident powerful stance',
        popularity: 6
      },
      {
        name: 'ashborn',
        aliases: ['shadow monarch', 'king of the dead'],
        description: 'Ashborn as original Shadow Monarch with black armor and purple flame-like aura, massive presence, shadow army commander aesthetic, dark godlike entity',
        popularity: 6
      }
    ]
  },

  // ========================================
  // FULLMETAL ALCHEMIST (12 characters)
  // ========================================
  'fullmetal-alchemist': {
    series: 'Fullmetal Alchemist',
    characters: [
      {
        name: 'edward',
        aliases: ['edward elric', 'ed', 'fullmetal alchemist'],
        description: 'Edward Elric with long blonde hair in braid, golden eyes, red coat with flamel symbol on back, automail right arm and left leg with mechanical details, alchemy transmutation circles, short stature complex, confident determined expression',
        popularity: 9
      },
      {
        name: 'alphonse',
        aliases: ['alphonse elric', 'al'],
        description: 'Alphonse Elric as large suit of armor with soul bound inside, flamel symbol on left shoulder, gentle kind personality despite imposing appearance, sometimes with kittens, protective big brother aesthetic',
        popularity: 8
      },
      {
        name: 'roy mustang',
        aliases: ['mustang', 'flame alchemist'],
        description: 'Roy Mustang with black hair, dark blue military uniform, white gloves with transmutation circles for flame alchemy, snapping fingers creating fire, ambitious colonel expression, charismatic leader aura',
        popularity: 8
      },
      {
        name: 'riza hawkeye',
        aliases: ['hawkeye'],
        description: 'Riza Hawkeye with blonde hair in practical style, military uniform, sniper rifles and handguns, serious professional expression, flame alchemy tattoo on back, loyal soldier aesthetic',
        popularity: 7
      },
      {
        name: 'scar',
        aliases: [],
        description: 'Scar with dark skin, white/silver hair, X-shaped scar across forehead, red alchemical tattoo on right arm, Ishvalan warrior monk appearance, destructive alchemy, intense vengeful expression',
        popularity: 7
      },
      {
        name: 'greed',
        aliases: ['greedling'],
        description: 'Greed with black spiky hair, sharp teeth, ultimate shield with black carbon armor covering body, homunculus ouroboros tattoo, cocky confident grin, avarice personified',
        popularity: 7
      },
      {
        name: 'envy',
        aliases: [],
        description: 'Envy with long green hair, androgynous appearance, shape-shifting abilities, true form as massive green monster, jealousy and mockery expression, homunculus ouroboros tattoo',
        popularity: 6
      },
      {
        name: 'lust',
        aliases: [],
        description: 'Lust with long black hair, red dress, ultimate spear with extending finger blades, homunculus ouroboros tattoo on chest, seductive deadly presence',
        popularity: 6
      },
      {
        name: 'father',
        aliases: ['homunculus'],
        description: 'Father with long hair and beard, appearing as aged Hohenheim, creating philosopher\'s stone, godlike alchemical powers, manipulating energy and souls, final boss presence',
        popularity: 6
      },
      {
        name: 'winry',
        aliases: ['winry rockbell'],
        description: 'Winry Rockbell with blonde hair tied with bandana, blue eyes, mechanic outfit with tools, automail engineering, cheerful determined expression, wrench weapon when angry at Ed',
        popularity: 6
      },
      {
        name: 'king bradley',
        aliases: ['wrath', 'fuhrer'],
        description: 'King Bradley with black hair, eye patch over right eye, military fuhrer uniform with medals, ultimate eye with precise combat sight, sword master, homunculus ouroboros tattoo, commanding dignified presence',
        popularity: 7
      },
      {
        name: 'hohenheim',
        aliases: ['van hohenheim'],
        description: 'Van Hohenheim with long blonde hair and beard, glasses, philosopher\'s stone within body, gentle wise expression, wandering father figure, golden eyes, ancient knowledge aura',
        popularity: 6
      }
    ]
  },

  // ========================================
  // TOKYO GHOUL (10 characters)
  // ========================================
  'tokyo-ghoul': {
    series: 'Tokyo Ghoul',
    characters: [
      {
        name: 'kaneki',
        aliases: ['ken kaneki', 'haise sasaki'],
        description: 'Ken Kaneki with white hair (post-torture) or black hair with white streaks, red-black kakugan ghoul eye, Jason mask or eyepatch, kagune tentacles emerging from back, CCG investigator suit or casual outfit, internal struggle expression, centipede aesthetic',
        popularity: 9
      },
      {
        name: 'touka',
        aliases: ['touka kirishima'],
        description: 'Touka Kirishima with purple-blue hair in bob cut, red-purple kakugan eye, waitress uniform or combat outfit, ukaku wing-like kagune with crystalline shards, rabbit mask (Anteiku days), strong protective expression',
        popularity: 8
      },
      {
        name: 'ayato',
        aliases: ['ayato kirishima'],
        description: 'Ayato Kirishima with blue-gray hair, red kakugan eye, Aogiri Tree outfit, ukaku kagune with projectile shards, rabbit aesthetic like Touka, aggressive rebellious expression, Aogiri executive',
        popularity: 6
      },
      {
        name: 'juuzou',
        aliases: ['juuzou suzuya', 'suzuya'],
        description: 'Juuzou Suzuya with white hair in messy style with red hair clips, stitches across body, red stitched under eye, dual quinque knives/scythe, childlike but psychotic expression, CCG investigator with unique fighting style',
        popularity: 7
      },
      {
        name: 'arima',
        aliases: ['kishou arima'],
        description: 'Kishou Arima with white hair, glasses, CCG white trench coat, IXA or Narukami quinque weapons, ghoul investigator, calm undefeatable presence, reaper of ghouls, tragic hero aesthetic',
        popularity: 7
      },
      {
        name: 'eto',
        aliases: ['eto yoshimura', 'one eyed owl'],
        description: 'Eto Yoshimura with green hair in bandaged style, kakugan eye, bandage wrappings, monstrous owl kakuja form with massive tentacles and armor, Aogiri Tree leader, author Sen Takatsuki aesthetic',
        popularity: 6
      },
      {
        name: 'uta',
        aliases: [],
        description: 'Uta with black hair, full-body tattoos including face, kakugan eyes, mask maker aesthetic, punk/gothic fashion, HySy ArtMask Studio, calm artistic expression, unique ghoul masks displayed',
        popularity: 6
      },
      {
        name: 'tsukiyama',
        aliases: ['shuu tsukiyama', 'gourmet'],
        description: 'Shuu Tsukiyama with purple hair styled elegantly, kakugan eye, fancy suits and formal wear, koukaku blade kagune, flamboyant dramatic expression, gourmet ghoul with eccentric personality',
        popularity: 6
      },
      {
        name: 'hide',
        aliases: ['hideyoshi nagachika'],
        description: 'Hideyoshi Nagachika with short blonde-brown hair, cheerful friendly expression, casual human clothing, loyal best friend to Kaneki, headphones and music aesthetic',
        popularity: 6
      },
      {
        name: 'jason',
        aliases: ['yamori'],
        description: 'Yamori "Jason" with white hair, muscular build, hockey mask, rinkaku kagune tentacles, torture tools including pliers, sadistic grin, Aogiri Tree torturer, intimidating brutal presence',
        popularity: 6
      }
    ]
  },

  // ========================================
  // JOJOS BIZARRE ADVENTURE (15 characters)
  // ========================================
  'jojos-bizarre-adventure': {
    series: 'JoJo\'s Bizarre Adventure',
    characters: [
      {
        name: 'jotaro',
        aliases: ['jotaro kujo'],
        description: 'Jotaro Kujo with black hair, white cap with golden accessories, purple/black school uniform with chain and pins, Star Platinum stand with muscular build, "Yare yare daze" expression, stoic cool demeanor, ora ora rush',
        popularity: 9
      },
      {
        name: 'dio',
        aliases: ['dio brando'],
        description: 'DIO with blonde hair, headband with heart symbol, yellow outfit or shirtless showing muscular build, The World stand stopping time, vampire fangs, "WRYYYY" and "ZA WARUDO" pose, confident villain smirk, road roller attack',
        popularity: 9
      },
      {
        name: 'joseph',
        aliases: ['joseph joestar'],
        description: 'Joseph Joestar with brown hair, green headband, fingerless gloves, Hermit Purple vine-like stand, clackers or Tommy gun, Hamon ripple energy, "OH MY GOD" expression, trickster confident pose',
        popularity: 8
      },
      {
        name: 'giorno',
        aliases: ['giorno giovanna'],
        description: 'Giorno Giovanna with blonde hair in distinctive curls/donuts, pink suit with ladybug brooches, Gold Experience stand creating life, confident ambitious expression, mafia boss aesthetic, piano theme',
        popularity: 9
      },
      {
        name: 'josuke',
        aliases: ['josuke higashikata'],
        description: 'Josuke Higashikata with tall pompadour hairstyle, purple and gold outfit with peace symbols and anchors, Crazy Diamond stand for restoration, friendly but fierce when hair insulted, Morioh town aesthetic',
        popularity: 8
      },
      {
        name: 'jolyne',
        aliases: ['jolyne cujoh'],
        description: 'Jolyne Cujoh with green hair in buns/puffs, green outfit with butterfly motifs, Stone Free stand with string powers, determined fierce expression, prison jumpsuit or battle outfit, female JoJo',
        popularity: 8
      },
      {
        name: 'jonathan',
        aliases: ['jonathan joestar'],
        description: 'Jonathan Joestar with dark blue hair, muscular gentlemanly build, Victorian-era suit or torn clothes, Hamon Overdrive sunlight energy, noble heroic expression, first JoJo, Phantom Blood',
        popularity: 7
      },
      {
        name: 'polnareff',
        aliases: ['jean pierre polnareff'],
        description: 'Jean Pierre Polnareff with tall silver hair in distinctive shape, French musketeer aesthetic, Silver Chariot stand with rapier, honorable comic relief expression, French accent personality',
        popularity: 7
      },
      {
        name: 'kakyoin',
        aliases: ['noriaki kakyoin'],
        description: 'Noriaki Kakyoin with red hair and distinctive curl, green school uniform, Hierophant Green stand with emerald splash, cherries, calm strategic expression, sunglasses',
        popularity: 7
      },
      {
        name: 'kira',
        aliases: ['yoshikage kira'],
        description: 'Yoshikage Kira with blonde hair, purple suit, Killer Queen stand with cat-like appearance, hand fetish obsession, calm serial killer trying to blend in, Sheer Heart Attack and Bites the Dust, "quiet life" aesthetic',
        popularity: 7
      },
      {
        name: 'bruno',
        aliases: ['bruno bucciarati'],
        description: 'Bruno Bucciarati with black bob haircut with bangs, white suit with zippers, Sticky Fingers stand creating zippers, licking to detect lies, gang leader protective expression, honorable mafioso',
        popularity: 7
      },
      {
        name: 'mista',
        aliases: ['guido mista'],
        description: 'Guido Mista with black hair, beanie hat with grid pattern, revealing outfit showing midriff, Sex Pistols stand (six bullet beings), revolver gun, number 4 phobia, laid-back gunslinger',
        popularity: 6
      },
      {
        name: 'narancia',
        aliases: ['narancia ghirga'],
        description: 'Narancia Ghirga with purple hair, crop top and skirt-like pants, Aerosmith airplane stand, headband, energetic childish expression, loyal fighter, switchblade',
        popularity: 6
      },
      {
        name: 'trish',
        aliases: ['trish una'],
        description: 'Trish Una with pink hair, fashionable outfit, Spice Girl stand, from scared to confident character growth, mafia boss daughter, stylish feminine aesthetic',
        popularity: 6
      },
      {
        name: 'pucci',
        aliases: ['enrico pucci'],
        description: 'Enrico Pucci with white hair (later), priest outfit, Whitesnake/C-Moon/Made in Heaven stands, DIO\'s friend, time acceleration, manipulative calm expression, heaven plan',
        popularity: 6
      }
    ]
  },

  // ========================================
  // FINAL FANTASY VII (10 characters)
  // ========================================
  'final-fantasy-vii': {
    series: 'Final Fantasy VII',
    characters: [
      {
        name: 'cloud',
        aliases: ['cloud strife'],
        description: 'Cloud Strife with spiky blonde hair defying gravity, blue mako eyes, purple SOLDIER uniform or black outfit, massive Buster Sword, materia orbs, limit break energy, stoic mercenary expression, motorcycle',
        popularity: 9
      },
      {
        name: 'sephiroth',
        aliases: [],
        description: 'Sephiroth with long flowing silver hair, green cat-like mako eyes, long black coat with silver pauldron, Masamune katana (extremely long blade), one black wing, One-Winged Angel, menacing calm expression, fire backdrop',
        popularity: 10
      },
      {
        name: 'tifa',
        aliases: ['tifa lockhart'],
        description: 'Tifa Lockhart with long black hair, red eyes, white tank top, black mini skirt, red gloves for martial arts, Final Heaven limit break, strong feminine fighter, bartender at Seventh Heaven, kind determined expression',
        popularity: 9
      },
      {
        name: 'aerith',
        aliases: ['aerith gainsborough', 'aeris'],
        description: 'Aerith Gainsborough with long brown hair in pink bow, green eyes, pink dress with red jacket, staff/rod weapon, flowers (yellow), holy materia, ancient Cetra, kind gentle expression, church setting',
        popularity: 8
      },
      {
        name: 'zack',
        aliases: ['zack fair'],
        description: 'Zack Fair with spiky black hair, blue SOLDIER uniform, Buster Sword, energetic puppy-like personality, materia, "embrace your dreams" motto, heroic sacrifice pose, DMW (Digital Mind Wave)',
        popularity: 8
      },
      {
        name: 'vincent',
        aliases: ['vincent valentine'],
        description: 'Vincent Valentine with long black hair, red eyes, red cloak and black outfit, golden claw left arm, Cerberus triple-barrel gun, vampire/demon transformations, brooding gothic aesthetic, coffin sleep',
        popularity: 7
      },
      {
        name: 'yuffie',
        aliases: ['yuffie kisaragi'],
        description: 'Yuffie Kisaragi with short black hair, ninja outfit in gray and black, giant shuriken, materia hunter, energetic mischievous expression, Wutai ninja, headband',
        popularity: 6
      },
      {
        name: 'barret',
        aliases: ['barret wallace'],
        description: 'Barret Wallace with dark skin, muscular build, gun-arm prosthetic, sunglasses, vest showing arms, AVALANCHE leader, protective father figure expression, eco-terrorist aesthetic',
        popularity: 6
      },
      {
        name: 'red xiii',
        aliases: ['nanaki'],
        description: 'Red XIII with red-orange fur, flame tip tail, one working eye, tribal feather decorations and markings, intelligent beast, Cosmo Canyon, wise expression despite young age',
        popularity: 6
      },
      {
        name: 'cait sith',
        aliases: [],
        description: 'Cait Sith as robotic cat riding large white moogle, megaphone, fortune teller aesthetic, cute but suspicious, Reeve-controlled robot, playful expression',
        popularity: 5
      }
    ]
  },

  // ========================================
  // ELDEN RING (8 characters)
  // ========================================
  'elden-ring': {
    series: 'Elden Ring',
    characters: [
      {
        name: 'malenia',
        aliases: ['malenia blade of miquella'],
        description: 'Malenia with long flowing red hair, golden prosthetic arm and leg, winged helmet, Scarlet Aeonia flower bloom, katana, rot-afflicted skin and wings, "I am Malenia, Blade of Miquella" presence, Goddess of Rot form with butterfly wings',
        popularity: 9
      },
      {
        name: 'radahn',
        aliases: ['starscourge radahn'],
        description: 'Starscourge Radahn as massive warrior with red hair in braids, ornate armor, dual colossal swords, tiny horse Leonard underneath, gravitational magic purple energy, meteor crash, festival battle, rotting but mighty',
        popularity: 8
      },
      {
        name: 'ranni',
        aliases: ['ranni the witch'],
        description: 'Ranni the Witch with blue skin, four arms, one eye closed (doll body), white dress, witch hat, staff, spectral ethereal aura, cracked porcelain-like skin, "mine will be an order not of gold" mystique',
        popularity: 8
      },
      {
        name: 'godfrey',
        aliases: ['hoarah loux'],
        description: 'Godfrey the First Elden Lord with golden lion Serosh on back, massive axe, ornate golden armor, long hair and beard, warrior king presence, Hoarah Loux transformation with bare-fisted combat',
        popularity: 7
      },
      {
        name: 'godrick',
        aliases: ['godrick the grafted'],
        description: 'Godrick the Grafted with multiple grafted limbs and dragon head arm, golden armor, axes and weapons, "bear witness" dragon grafting moment, grotesque but regal, Stormveil Castle',
        popularity: 6
      },
      {
        name: 'morgott',
        aliases: ['morgott the omen king'],
        description: 'Morgott the Omen King with curved horns, tail, holy weapons materialized, walking stick/cane, golden Leyndell aesthetic, "willful traitors all" curse, omen features hidden under cloak',
        popularity: 6
      },
      {
        name: 'mohg',
        aliases: ['mohg lord of blood'],
        description: 'Mohg Lord of Blood with curved horns, blood-flame trident, wings, "NIHIL" blood curse, Mohgwyn Dynasty, blood magic red effects, omen features with elegant twisted nobility',
        popularity: 6
      },
      {
        name: 'maliketh',
        aliases: ['maliketh the black blade'],
        description: 'Maliketh the Black Blade as beast-like clergyman with black and gold armor, Destined Death black blade with red runes, bestial features, Gurranq transformation, agile deadly movements',
        popularity: 7
      }
    ]
  },

  // ========================================
  // GOD OF WAR (6 characters)
  // ========================================
  'god-of-war': {
    series: 'God of War',
    characters: [
      {
        name: 'kratos',
        aliases: [],
        description: 'Kratos with pale white skin from ashes, red tattoo from eye across body, bald head with beard (Norse era), muscular scarred build, Blades of Chaos with chains, Leviathan Axe, leather wrappings and armor, stoic father protecting son, Spartan warrior',
        popularity: 10
      },
      {
        name: 'atreus',
        aliases: ['loki'],
        description: 'Atreus with brown hair in ponytail, young Norse outfit with bow and arrows, Jotnar heritage, runic magic, learning warrior skills, determined expression, relationship with father Kratos',
        popularity: 7
      },
      {
        name: 'thor',
        aliases: [],
        description: 'Thor with red hair and beard, massive muscular build, Mjolnir hammer, blue eyes, Norse armor and furs, lightning powers, intimidating brutal presence, Norse mythology reimagined',
        popularity: 8
      },
      {
        name: 'odin',
        aliases: ['all-father'],
        description: 'Odin with one eye, disguises as Tyr, blue raven (Huginn and Muninn), Norse all-father robes and armor, manipulative cunning expression, seeking knowledge obsessively',
        popularity: 6
      },
      {
        name: 'freya',
        aliases: ['frigg'],
        description: 'Freya with blonde hair, Vanir goddess beauty, warrior and magic abilities, Valkyrie wings and armor, conflicted between revenge and wisdom, protective mother of Baldur',
        popularity: 6
      },
      {
        name: 'baldur',
        aliases: [],
        description: 'Baldur with blonde hair and beard, Nordic tattoos glowing when invulnerable, shirtless showing muscular build, unable to feel pain or damage (curse), tragic villain seeking to feel again',
        popularity: 5
      }
    ]
  },

  // ========================================
  // LEAGUE OF LEGENDS (12 characters)
  // ========================================
  'league-of-legends': {
    series: 'League of Legends',
    characters: [
      {
        name: 'yasuo',
        aliases: [],
        description: 'Yasuo with long black ponytail, katana sword, wind techniques with tornado swirls, red scarf, samurai ronin aesthetic, sake bottle, determined wanderer expression, "death is like the wind" aura',
        popularity: 8
      },
      {
        name: 'ahri',
        aliases: [],
        description: 'Ahri with long black hair with fox ears, nine fox tails, whisker marks on face, charm magic pink hearts, revealing outfit, seductive mystical expression, Vastayan fox spirit, orb of deception',
        popularity: 9
      },
      {
        name: 'jinx',
        aliases: [],
        description: 'Jinx with long blue braids, pink eyes, tattoo clouds on arm, Pow-Pow minigun and Fishbones rocket launcher, purple crop top and pants, grenades and explosives, chaotic manic grin, Zaun chaos',
        popularity: 9
      },
      {
        name: 'vi',
        aliases: [],
        description: 'Vi with pink hair, Atlas gauntlets (massive hextech fists), punk outfit with jacket, tattoos, Piltover enforcer, "here comes the fist" attitude, protective sister to Jinx, confident fighter',
        popularity: 8
      },
      {
        name: 'ekko',
        aliases: [],
        description: 'Ekko with white hair in mohawk, Z-Drive time device on back, bat/sword weapon, graffiti and street art, Zaun inventor, time rewind effects with afterimages, youthful genius expression',
        popularity: 7
      },
      {
        name: 'lux',
        aliases: ['luxanna'],
        description: 'Lux with blonde hair, blue eyes, white and gold Demacian armor, staff with light magic, Final Spark laser beam, noble mage hiding powers, radiant positive expression',
        popularity: 7
      },
      {
        name: 'thresh',
        aliases: [],
        description: 'Thresh as undead specter with glowing green eyes in lantern-like head, chain and sickle hook, dark robes, souls in lantern, Shadow Isles wraith, sadistic collector of souls',
        popularity: 7
      },
      {
        name: 'zed',
        aliases: [],
        description: 'Zed with ninja mask and armor in red and black, shadow blades and shurikens, forbidden shadow techniques, red eyes, master of shadows, rival to Shen, Ionian ninja',
        popularity: 7
      },
      {
        name: 'ezreal',
        aliases: [],
        description: 'Ezreal with blonde hair, adventurer outfit with goggles, gauntlet shooting arcane energy bolts, confident explorer smirk, treasure hunter aesthetic, teleporting blink',
        popularity: 6
      },
      {
        name: 'akali',
        aliases: [],
        description: 'Akali with black hair in ponytail with neon highlights, mask over face, kunai and kama weapons, tattoo on back, rogue ninja aesthetic, smoke bomb shroud, Kinkou Order deserter',
        popularity: 7
      },
      {
        name: 'kayn',
        aliases: ['shieda kayn'],
        description: 'Kayn with white hair, Darkin scythe Rhaast, shadow assassin form or Darkin transformation with red demonic features, Zed\'s student, edgy reaper aesthetic',
        popularity: 6
      },
      {
        name: 'pyke',
        aliases: [],
        description: 'Pyke as undead specter from Bilgewater, harpoon and dagger, drowned revenant with water effects, list of betrayers, spectral green glow, ripper aesthetic, "they all sink"',
        popularity: 6
      }
    ]
  },

  // ========================================
  // OVERWATCH (10 characters)
  // ========================================
  'overwatch': {
    series: 'Overwatch',
    characters: [
      {
        name: 'genji',
        aliases: ['genji shimada'],
        description: 'Genji with cybernetic ninja body in green and silver, Japanese oni mask, katana dragonblade glowing, shuriken, agile cyborg, "I need healing" meme, dragons of the Shimada clan, balanced human-machine aesthetic',
        popularity: 8
      },
      {
        name: 'hanzo',
        aliases: ['hanzo shimada'],
        description: 'Hanzo with black hair in topknot, blue dragon tattoo on arm, bow and arrow with lightning, serious stoic expression, muscular archer build, Japanese traditional outfit mixed with tactical gear, Shimada clan honor',
        popularity: 7
      },
      {
        name: 'mercy',
        aliases: ['angela ziegler'],
        description: 'Mercy with blonde hair in ponytail, angelic Valkyrie suit with glowing wings, staff/caduceus with healing beam, halo, Swiss doctor, "heroes never die" resurrection, kind caring expression',
        popularity: 8
      },
      {
        name: 'dva',
        aliases: ['d.va', 'hana song'],
        description: 'D.Va with long brown hair, pink mech suit (MEKA) with bunny logo, gamer girl in bodysuit with headset and logo, Korean pro gamer, light gun, "nerf this" self-destruct, confident playful expression',
        popularity: 8
      },
      {
        name: 'reaper',
        aliases: ['gabriel reyes'],
        description: 'Reaper with skull mask, black hooded cloak, dual shotguns, smoke/wraith form effects, red eyes through mask, edgy death aesthetic, "die die die" ultimate, Blackwatch past',
        popularity: 7
      },
      {
        name: 'tracer',
        aliases: ['lena oxton'],
        description: 'Tracer with spiky brown hair, orange goggles, blue jacket, chronal accelerator on chest, dual pulse pistols, time blink trail effects, British accent personality, cheerful energetic pose, "cheers love"',
        popularity: 8
      },
      {
        name: 'widowmaker',
        aliases: ['amelie lacroix'],
        description: 'Widowmaker with long blue ponytail, purple skin, yellow eyes, black bodysuit, sniper rifle, spider aesthetic, cold emotionless assassin expression, French femme fatale',
        popularity: 7
      },
      {
        name: 'reinhardt',
        aliases: ['reinhardt wilhelm'],
        description: 'Reinhardt with white hair and beard, massive crusader armor with lion motifs, rocket hammer, barrier shield, German knight, "hammer down" shatter, honorable heroic expression',
        popularity: 7
      },
      {
        name: 'soldier 76',
        aliases: ['jack morrison'],
        description: 'Soldier 76 with gray hair, red visor mask, blue jacket with 76, pulse rifle, tactical visor aim, grizzled vigilante, "we\'re all soldiers now" dad energy, former Strike Commander',
        popularity: 6
      },
      {
        name: 'pharah',
        aliases: ['fareeha amari'],
        description: 'Pharah with Egyptian-inspired Raptora suit armor in blue and gold, rocket launcher, jet pack with aerial flight, Eye of Horus helmet, "justice rains from above" rocket barrage',
        popularity: 6
      }
    ]
  },

  // ========================================
  // STREET FIGHTER (8 characters)
  // ========================================
  'street-fighter': {
    series: 'Street Fighter',
    characters: [
      {
        name: 'ryu',
        aliases: [],
        description: 'Ryu with black spiky hair, white karate gi with torn sleeves, red headband, black belt, bare feet, hadouken fireball charging, Shoryuken uppercut, stoic focused expression, wandering warrior seeking strength',
        popularity: 8
      },
      {
        name: 'ken',
        aliases: ['ken masters'],
        description: 'Ken Masters with blonde spiky hair, red karate gi, black belt, Shoryuken with fire, confident cocky grin, American flag, wealthy fighter aesthetic, Ryu\'s rival and friend',
        popularity: 7
      },
      {
        name: 'chun-li',
        aliases: [],
        description: 'Chun-Li with twin bun hairstyle (ox horns), blue qipao dress with gold accents, white boots, spiked bracelets, lightning kick (hundred kicks), thick powerful legs, ICPO detective, "strongest woman" pose',
        popularity: 9
      },
      {
        name: 'akuma',
        aliases: ['gouki'],
        description: 'Akuma with red glowing eyes, dark gi with kanji on back, prayer beads around neck, Satsui no Hado dark energy, purple/dark aura, fierce demon expression, Raging Demon attack, "heaven" kanji symbol',
        popularity: 8
      },
      {
        name: 'm. bison',
        aliases: ['bison', 'vega (japan)'],
        description: 'M. Bison with white hair, red military uniform with cape, Psycho Power purple energy, levitating pose, "for me it was Tuesday" villain energy, Shadaloo dictator, skull imagery',
        popularity: 7
      },
      {
        name: 'guile',
        aliases: [],
        description: 'Guile with tall blonde flat-top hair, American flag tattoo, green military uniform, dog tags, sonic boom projectile, flash kick, stoic soldier expression, US Air Force',
        popularity: 6
      },
      {
        name: 'sagat',
        aliases: [],
        description: 'Sagat with bald head, eye patch, massive scar across chest from Ryu, purple shorts, Muay Thai fighter, tiger uppercut and shot, "emperor of Muay Thai" presence, tall intimidating build',
        popularity: 6
      },
      {
        name: 'cammy',
        aliases: ['cammy white'],
        description: 'Cammy with blonde hair in braids with red beret, green leotard with red accents, long legs with cannon drill spin, British special forces, Shadaloo past, serious tactical expression',
        popularity: 7
      }
    ]
  },

  // ========================================
  // MARVEL (15 characters)
  // ========================================
  'marvel': {
    series: 'Marvel',
    characters: [
      {
        name: 'spider-man',
        aliases: ['spiderman', 'peter parker', 'miles morales'],
        description: 'Spider-Man with red and blue suit with web pattern and spider emblem on chest, web-shooters, hanging from web or swinging, spider-sense visualization, mask with large white eye lenses, acrobatic pose, New York City skyline',
        popularity: 10
      },
      {
        name: 'venom',
        aliases: [],
        description: 'Venom with black symbiote covering muscular body, large white spider emblem on chest, long tongue and sharp teeth, white veiny eyes, clawed hands, aggressive menacing pose, "we are Venom" presence',
        popularity: 9
      },
      {
        name: 'carnage',
        aliases: ['cletus kasady'],
        description: 'Carnage with red and black symbiote, tendrils and weapons forming from body, sharp teeth and maniacal grin, chaotic violent aesthetic, more monstrous than Venom, serial killer energy',
        popularity: 7
      },
      {
        name: 'wolverine',
        aliases: ['logan', 'weapon x'],
        description: 'Wolverine with distinctive hair tufts/horns, adamantium claws extended from knuckles, yellow and blue X-Men suit or leather jacket, muscular build, cigar, fierce berserker expression, healing factor scars',
        popularity: 9
      },
      {
        name: 'deadpool',
        aliases: ['wade wilson'],
        description: 'Deadpool with red and black suit, katanas crossed on back, dual pistols, mask with black eye patches, breaking fourth wall, chimichanga, inappropriate gesture, regenerating from damage, taco, maximum effort',
        popularity: 9
      },
      {
        name: 'iron man',
        aliases: ['tony stark'],
        description: 'Iron Man in red and gold armor, arc reactor glowing in chest, repulsor beams from palms, flying pose with rockets, faceplate up revealing Tony Stark face, AI HUD displays, genius billionaire playboy philanthropist',
        popularity: 9
      },
      {
        name: 'thor',
        aliases: ['god of thunder'],
        description: 'Thor with long blonde hair, red cape, Asgardian armor with silver and blue, Mjolnir hammer with lightning, muscular build, beard (later), lightning effects, godly presence, "I am Thor, son of Odin"',
        popularity: 8
      },
      {
        name: 'hulk',
        aliases: ['bruce banner'],
        description: 'Hulk with massive green muscular body, torn purple pants, veins bulging, angry rage expression, smashing pose, gamma radiation green glow, "Hulk smash" destruction, towering over others',
        popularity: 8
      },
      {
        name: 'captain america',
        aliases: ['steve rogers', 'cap'],
        description: 'Captain America with blonde hair, red white and blue suit with star on chest, shield with concentric circles, patriotic hero, "I can do this all day" determination, super soldier serum, World War II aesthetic',
        popularity: 8
      },
      {
        name: 'black panther',
        aliases: ['tchalla'],
        description: 'Black Panther in sleek black vibranium suit with silver/purple highlights, claws extended, cat-like helmet with pointed ears, Wakanda forever salute, African patterns, king and warrior, vibranium kinetic energy',
        popularity: 8
      },
      {
        name: 'doctor strange',
        aliases: ['stephen strange'],
        description: 'Doctor Strange with gray temples in hair, red Cloak of Levitation with collar, mystical hand signs, Eye of Agamotto time stone, green magic circles and runes, Sanctum Sanctorum, Sorcerer Supreme',
        popularity: 7
      },
      {
        name: 'ghost rider',
        aliases: ['johnny blaze'],
        description: 'Ghost Rider with flaming skull head, hellfire, leather jacket with spikes, chain weapon, motorcycle, penance stare, demonic vengeance, "spirit of vengeance" aura, burning tire tracks',
        popularity: 8
      },
      {
        name: 'magneto',
        aliases: ['erik lehnsherr'],
        description: 'Magneto with red and purple costume and cape, helmet to block telepathy, magnetic fields visualized with metal objects floating, Master of Magnetism, Holocaust survivor background, X-Men villain/antihero',
        popularity: 7
      },
      {
        name: 'loki',
        aliases: [],
        description: 'Loki with black hair slicked back, green and gold Asgardian armor with horned helmet, scepter with mind stone, illusion magic duplicates, trickster mischievous grin, "burdened with glorious purpose"',
        popularity: 8
      },
      {
        name: 'thanos',
        aliases: [],
        description: 'Thanos with purple skin, gold armor, Infinity Gauntlet with six colored stones, massive muscular build, chin ridges, reality-warping snap, "perfectly balanced" philosophy, Mad Titan presence',
        popularity: 8
      }
    ]
  },

  // ========================================
  // DC COMICS (12 characters)
  // ========================================
  'dc-comics': {
    series: 'DC Comics',
    characters: [
      {
        name: 'batman',
        aliases: ['bruce wayne', 'dark knight'],
        description: 'Batman with black cowl with pointed ears, black cape spreading like wings, bat symbol on chest, utility belt, Gotham City rooftops, dark shadows, grappling hook, serious vigilante expression, "I am vengeance"',
        popularity: 10
      },
      {
        name: 'joker',
        aliases: [],
        description: 'Joker with green hair, white clown makeup, red lips in Glasgow smile, purple suit, playing cards, laughing gas, crowbar, maniacal grin, "why so serious" chaos, Batman\'s nemesis',
        popularity: 10
      },
      {
        name: 'harley quinn',
        aliases: ['harleen quinzel'],
        description: 'Harley Quinn with blonde hair in pigtails (blue and pink tips), red and black jester outfit or shorts with jacket, baseball bat, mallet, "puddin" obsession, chaotic fun energy, diamonds pattern',
        popularity: 9
      },
      {
        name: 'superman',
        aliases: ['clark kent', 'kal-el'],
        description: 'Superman with black hair and spit curl, blue suit with red cape, red S-shield symbol on chest, flying pose with fist forward, heat vision red eyes, Metropolis hero, "truth justice and the American way"',
        popularity: 9
      },
      {
        name: 'wonder woman',
        aliases: ['diana prince'],
        description: 'Wonder Woman with long black hair, red and gold armor/bustier with blue skirt, golden tiara with star, Lasso of Truth, silver bracelets deflecting bullets, sword and shield, Amazonian warrior princess, powerful heroic pose',
        popularity: 8
      },
      {
        name: 'flash',
        aliases: ['barry allen'],
        description: 'Flash in red suit with gold lightning bolt on chest, lightning speed effects trailing, gold boots and accents, cowl with ear wings, Speed Force energy, "fastest man alive", vibrating through walls',
        popularity: 7
      },
      {
        name: 'aquaman',
        aliases: ['arthur curry'],
        description: 'Aquaman with blonde long hair and beard, orange and green scales armor, trident, underwater ocean setting, marine life, Atlantis king, communicating with sea creatures, muscular Polynesian-inspired',
        popularity: 6
      },
      {
        name: 'green lantern',
        aliases: ['hal jordan'],
        description: 'Green Lantern with green and black suit, power ring glowing, lantern symbol on chest, green energy constructs (fist, shield, weapons), willpower manifestation, Oa Corps, "in brightest day"',
        popularity: 6
      },
      {
        name: 'cyborg',
        aliases: ['victor stone'],
        description: 'Cyborg with half-human half-machine body, cybernetic enhancements, glowing blue tech, arm cannon, "booyah" catchphrase, Justice League tech support, digital interface',
        popularity: 5
      },
      {
        name: 'nightwing',
        aliases: ['dick grayson', 'robin'],
        description: 'Nightwing in black suit with blue bird emblem across chest and arms, escrima sticks, acrobatic flip pose, former Robin grown up, Bludhaven, confident smirk',
        popularity: 6
      },
      {
        name: 'deathstroke',
        aliases: ['slade wilson'],
        description: 'Deathstroke with orange and black armor, half-mask over one eye, white hair, katana and staff, tactical mercenary gear, "Terminator" assassin, gun arsenal, Teen Titans villain',
        popularity: 6
      },
      {
        name: 'raven',
        aliases: [],
        description: 'Raven with purple-blue hair, dark blue hooded cloak, four red eyes (demon form), soul-self shadow projection, Teen Titans, meditation pose, "Azarath Metrion Zinthos" incantation, demonic Trigon heritage',
        popularity: 6
      }
    ]
  },

  // ========================================
  // STAR WARS (10 characters)
  // ========================================
  'star-wars': {
    series: 'Star Wars',
    characters: [
      {
        name: 'darth vader',
        aliases: ['anakin skywalker'],
        description: 'Darth Vader in black armor and helmet with breathing apparatus, red lightsaber, black cape flowing, Force choke hand gesture, "I am your father" presence, Imperial march, Death Star background',
        popularity: 10
      },
      {
        name: 'yoda',
        aliases: [],
        description: 'Yoda with green skin, large pointed ears, small elderly stature, brown Jedi robes, wooden cane, green lightsaber, Force levitation, wise ancient expression, "do or do not, there is no try"',
        popularity: 8
      },
      {
        name: 'mandalorian',
        aliases: ['mando', 'din djarin'],
        description: 'Mandalorian in beskar armor with T-visor helmet, jetpack, rifle and blaster, "This is the Way" creed, Grogu (Baby Yoda) with him, bounty hunter aesthetic, shoulder pauldron, Western space aesthetic',
        popularity: 9
      },
      {
        name: 'ahsoka',
        aliases: ['ahsoka tano'],
        description: 'Ahsoka Tano with orange skin (Togruta), white and blue head-tails (lekku and montrals), white robes or dark outfit, dual white lightsabers (later), facial markings, former Jedi, confident wise warrior',
        popularity: 8
      },
      {
        name: 'luke skywalker',
        aliases: [],
        description: 'Luke Skywalker with blonde hair, black Jedi outfit or Tatooine robes, green lightsaber, X-wing pilot, Force powers, moisture farm or Jedi master appearance, hopeful hero expression',
        popularity: 8
      },
      {
        name: 'princess leia',
        aliases: ['leia organa'],
        description: 'Princess Leia with iconic cinnamon bun hairstyles or braids, white senatorial dress or rebel outfit with blaster, leadership presence, "help me Obi-Wan" hologram, strong royal rebel',
        popularity: 7
      },
      {
        name: 'kylo ren',
        aliases: ['ben solo'],
        description: 'Kylo Ren in black robes and helmet with silver accents, red crackling crossguard lightsaber, dark side energy, conflicted mask removal, First Order aesthetic, grandson of Vader',
        popularity: 7
      },
      {
        name: 'boba fett',
        aliases: [],
        description: 'Boba Fett in green Mandalorian armor with battle damage, T-visor helmet with rangefinder, jetpack with missile, EE-3 blaster rifle, bounty hunter gadgets, sarlacc survival scars, "no disintegrations"',
        popularity: 8
      },
      {
        name: 'grogu',
        aliases: ['baby yoda', 'the child'],
        description: 'Grogu as small green infant of Yoda\'s species, large dark eyes, brown Jedi robes, Force abilities, floating in hovering pram, eating frog or cookies, adorable expressions, 50 years old baby',
        popularity: 9
      },
      {
        name: 'maul',
        aliases: ['darth maul'],
        description: 'Darth Maul with red and black Zabrak facial tattoos, horns on head, yellow Sith eyes, double-bladed red lightsaber, "Duel of the Fates" energy, rage and vengeance, cybernetic legs (later)',
        popularity: 7
      }
    ]
  },

  // ========================================
  // HORROR (10 characters)
  // ========================================
  'horror': {
    series: 'Horror Icons',
    characters: [
      {
        name: 'jason voorhees',
        aliases: ['jason', 'friday the 13th'],
        description: 'Jason Voorhees with white hockey mask, machete weapon, tattered clothes, massive muscular build, Camp Crystal Lake setting, undead slasher presence, blood splatter, full moon',
        popularity: 8
      },
      {
        name: 'freddy krueger',
        aliases: ['freddy'],
        description: 'Freddy Krueger with burned face, red and green striped sweater, brown fedora hat, glove with finger blades, nightmare dream world fire, sinister grin, "welcome to my nightmare"',
        popularity: 8
      },
      {
        name: 'michael myers',
        aliases: ['the shape'],
        description: 'Michael Myers with white emotionless mask, dark coveralls, kitchen knife, silent stalking presence, Halloween night setting, heavy breathing, unstoppable evil',
        popularity: 8
      },
      {
        name: 'pennywise',
        aliases: ['it', 'pennywise the clown'],
        description: 'Pennywise the Dancing Clown with white clown makeup, red hair tufts, orange pom-poms on suit, sharp teeth smile, red balloon, yellow eyes, Derry sewer, shapeshifting horror, "you\'ll float too"',
        popularity: 9
      },
      {
        name: 'ghostface',
        aliases: ['scream killer'],
        description: 'Ghostface with white elongated screaming mask, black robes, hunting knife, phone in hand, "what\'s your favorite scary movie", slasher film meta, Scream franchise',
        popularity: 7
      },
      {
        name: 'pinhead',
        aliases: ['hell priest'],
        description: 'Pinhead with pale skin, grid of pins hammered into head in pattern, black leather Cenobite outfit, chains with hooks, puzzle box (Lament Configuration), "we have such sights to show you"',
        popularity: 6
      },
      {
        name: 'chucky',
        aliases: ['charles lee ray', 'good guy doll'],
        description: 'Chucky as possessed Good Guy doll with red hair, overalls with "Good Guys" logo, stitched scars on face, holding knife, blue eyes turning evil, small but deadly, voodoo soul transfer',
        popularity: 7
      },
      {
        name: 'leatherface',
        aliases: [],
        description: 'Leatherface with mask made of human skin, chainsaw weapon, butcher apron, Texas Chainsaw Massacre, large intimidating build, slaughterhouse aesthetic',
        popularity: 6
      },
      {
        name: 'pyramid head',
        aliases: [],
        description: 'Pyramid Head with massive triangular pyramid helmet, muscular body, great knife or spear, Silent Hill fog, executioner aesthetic, dragging heavy weapon, disturbing presence',
        popularity: 7
      },
      {
        name: 'xenomorph',
        aliases: ['alien'],
        description: 'Xenomorph alien with elongated head, inner jaw extending, black biomechanical exoskeleton, long tail, acidic blood, HR Giger design, hive setting, face-hugger, perfect organism',
        popularity: 8
      }
    ]
  },

  // ========================================
  // DISNEY / PIXAR (8 characters)
  // ========================================
  'disney': {
    series: 'Disney/Pixar',
    characters: [
      {
        name: 'stitch',
        aliases: ['experiment 626'],
        description: 'Stitch with blue alien fur, large ears that can fold down, four arms (hidden pair), two antennae, big black eyes, mischievous smile showing teeth, "Ohana means family" ukulele, Hawaiian aesthetic',
        popularity: 9
      },
      {
        name: 'jack skellington',
        aliases: ['pumpkin king'],
        description: 'Jack Skellington as skeleton in black pinstripe suit with bat bow tie, tall thin frame, stitched smile, hollow eye sockets, Halloween Town King, Santa Jack outfit, tragic romantic, "what\'s this" wonder',
        popularity: 9
      },
      {
        name: 'maleficent',
        aliases: [],
        description: 'Maleficent with black horns, purple and black robes, green skin, staff with glowing orb, raven familiar, dragon transformation, "mistress of all evil" presence, sleeping beauty curse',
        popularity: 7
      },
      {
        name: 'elsa',
        aliases: [],
        description: 'Elsa with platinum blonde hair in braid, ice queen dress in blue, snowflake patterns, ice magic creating fractals and snow, "Let It Go" pose, Frozen kingdom, ice castle, confident regal expression',
        popularity: 8
      },
      {
        name: 'simba',
        aliases: [],
        description: 'Simba as lion cub or adult male lion with red mane, Pride Rock, Circle of Life sun, roaring pose, Lion King heir, Rafiki\'s presentation, "remember who you are"',
        popularity: 7
      },
      {
        name: 'baymax',
        aliases: [],
        description: 'Baymax as inflatable white healthcare robot with simple dot eyes and line mouth, round huggable body, red armor (superhero mode), "I am satisfied with my care" wholesome presence',
        popularity: 7
      },
      {
        name: 'mike wazowski',
        aliases: ['mike'],
        description: 'Mike Wazowski as round green one-eyed monster, small arms and legs, Monsters Inc employee, hardhat, scare records, "I can\'t believe it, I\'m on TV" energy',
        popularity: 6
      },
      {
        name: 'sulley',
        aliases: ['james p sullivan'],
        description: 'Sulley as large furry blue monster with purple spots, horns, tail, Monsters Inc top scarer, gentle giant with Boo, "kitty" nickname, friendly roar',
        popularity: 6
      }
    ]
  }
};

/**
 * Utility functions for character database access
 */

/**
 * Flatten database into simple name-to-description map for quick lookups
 * @returns {Object} Map of character names/aliases to descriptions
 */
function buildCharacterMap() {
  const map = {};

  Object.values(CHARACTER_DATABASE).forEach(series => {
    series.characters.forEach(character => {
      // Add primary name
      map[character.name.toLowerCase()] = character.description;

      // Add all aliases
      character.aliases.forEach(alias => {
        map[alias.toLowerCase()] = character.description;
      });
    });
  });

  return map;
}

/**
 * Get all character names and aliases for regex matching
 * @returns {Array<string>} All searchable character names
 */
function getAllCharacterNames() {
  const names = [];

  Object.values(CHARACTER_DATABASE).forEach(series => {
    series.characters.forEach(character => {
      names.push(character.name);
      names.push(...character.aliases);
    });
  });

  return names;
}

/**
 * Get characters by series
 * @param {string} seriesKey - Series identifier (e.g., 'hunter-x-hunter')
 * @returns {Array<Object>} Characters from that series
 */
function getCharactersBySeries(seriesKey) {
  return CHARACTER_DATABASE[seriesKey]?.characters || [];
}

/**
 * Search for character by partial name match
 * @param {string} query - Search query
 * @returns {Array<Object>} Matching characters with series info
 */
function searchCharacters(query) {
  const lowerQuery = query.toLowerCase();
  const results = [];

  Object.entries(CHARACTER_DATABASE).forEach(([seriesKey, seriesData]) => {
    seriesData.characters.forEach(character => {
      const matchesName = character.name.includes(lowerQuery);
      const matchesAlias = character.aliases.some(alias =>
        alias.toLowerCase().includes(lowerQuery)
      );

      if (matchesName || matchesAlias) {
        results.push({
          ...character,
          series: seriesData.series,
          seriesKey
        });
      }
    });
  });

  // Sort by popularity
  return results.sort((a, b) => b.popularity - a.popularity);
}

/**
 * Get top N most popular characters across all series
 * @param {number} limit - Number of characters to return
 * @returns {Array<Object>} Top characters with series info
 */
function getTopCharacters(limit = 10) {
  const allCharacters = [];

  Object.entries(CHARACTER_DATABASE).forEach(([seriesKey, seriesData]) => {
    seriesData.characters.forEach(character => {
      allCharacters.push({
        ...character,
        series: seriesData.series,
        seriesKey
      });
    });
  });

  return allCharacters
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit);
}

export {
  CHARACTER_DATABASE,
  buildCharacterMap,
  getAllCharacterNames,
  getCharactersBySeries,
  searchCharacters,
  getTopCharacters
};
