// Procedural NPC roster generation.
//
// The hand-written roster in `npcs.ts` gives the world its recognisable faces.
// This generator fills the rest of the scene out to a believable size — a few
// hundred names per major market, weighted by `sceneSize` in `locations.ts`.
//
// Everything here is deterministic given a seed, so the same country produces
// the same roster on every run without needing to persist ~1,500 NPC records.

import { ROSTER_GENRES } from './genres';
import type { NPC, NPCRole, NPCTier, Genre, Gender } from '../types/game';
import { LOCATIONS } from './locations';

// ─── NAME POOLS ───────────────────────────────────────────────────────────
// Deliberately broad and mixed. Ghanaian/Nigerian pools are deep because those
// scenes are the game's centre of gravity.

const FIRST_NAMES: Record<string, { male: string[]; female: string[] }> = {
  Ghana: {
    male: ['Kwame', 'Kofi', 'Yaw', 'Kwabena', 'Kojo', 'Kwaku', 'Kwesi', 'Nana', 'Fiifi', 'Ato',
           'Ebo', 'Paa', 'Kwadwo', 'Elikem', 'Sena', 'Yoofi', 'Nii', 'Abeiku', 'Kobby', 'Kwabena'],
    female: ['Ama', 'Akosua', 'Adwoa', 'Afia', 'Esi', 'Yaa', 'Abena', 'Efua', 'Araba', 'Naa',
             'Mawusi', 'Dzifa', 'Enyonam', 'Sena', 'Akua', 'Baaba', 'Serwaa', 'Maame', 'Adjoa', 'Nana Ama'],
  },
  Nigeria: {
    male: ['Chidi', 'Emeka', 'Tunde', 'Bola', 'Seyi', 'Kunle', 'Obi', 'Ifeanyi', 'Femi', 'Wale',
           'Ade', 'Chinedu', 'Davido', 'Uche', 'Segun', 'Nnamdi', 'Tobi', 'Gbenga', 'Chuka', 'Blaze'],
    female: ['Amara', 'Ngozi', 'Temi', 'Bisi', 'Yemi', 'Ada', 'Chioma', 'Funke', 'Kemi', 'Ife',
             'Tola', 'Nneka', 'Zainab', 'Sade', 'Uzo', 'Aisha', 'Titi', 'Blessing', 'Rita', 'Tiwa'],
  },
  'South Africa': {
    male: ['Sipho', 'Thabo', 'Mandla', 'Kabelo', 'Lucky', 'Siyabonga', 'Tshepo', 'Kagiso', 'Njabulo', 'Andile',
           'Bongani', 'Lwazi', 'Mpho', 'Katlego', 'Themba', 'Lutho', 'Anele', 'Bandile', 'Sifiso', 'Tumelo'],
    female: ['Zanele', 'Thandi', 'Nomvula', 'Lerato', 'Palesa', 'Nandi', 'Ayanda', 'Bongi', 'Refilwe', 'Zodwa',
             'Naledi', 'Khanyi', 'Lindiwe', 'Busisiwe', 'Ntombi', 'Amahle', 'Zinhle', 'Nonhlanhla', 'Mbali', 'Precious'],
  },
  USA: {
    male: ['Marcus', 'Darius', 'Andre', 'Terrell', 'Jamar', 'Tyrone', 'Malik', 'Isaiah', 'Xavier', 'DeShawn',
           'Anthony', 'Jerome', 'Kevin', 'Rashad', 'Lamar', 'Curtis', 'Dante', 'Jamal', 'Trevor', 'Ezekiel'],
    female: ['Aaliyah', 'Imani', 'Nia', 'Zaria', 'Tiana', 'Keisha', 'Monique', 'Latoya', 'Ayesha', 'Jasmine',
             'Destiny', 'Ebony', 'Shanice', 'Tasha', 'Raven', 'Simone', 'Alicia', 'Brianna', 'Camille', 'Dominique'],
  },
  UK: {
    male: ['Liam', 'Callum', 'Reece', 'Tyrone', 'Jerome', 'Ashley', 'Kieran', 'Duane', 'Wesley', 'Ollie',
           'Rio', 'Femi', 'Kadeem', 'Bailey', 'Jordan', 'Tayo', 'Marcus', 'Denzel', 'Alfie', 'Simeon'],
    female: ['Chloe', 'Shanice', 'Keziah', 'Maya', 'Tiana', 'Amara', 'Layla', 'Rhianne', 'Dionne', 'Nadine',
             'Yasmin', 'Leah', 'Aaliyah', 'Bethany', 'Sasha', 'Naomi', 'Rochelle', 'Danielle', 'Paige', 'Zara'],
  },
  Kenya: {
    male: ['Juma', 'Otieno', 'Kamau', 'Njoroge', 'Wanjala', 'Baraka', 'Moses', 'Brian', 'Kevin', 'Dennis'],
    female: ['Wanjiru', 'Achieng', 'Njeri', 'Atieno', 'Zawadi', 'Mercy', 'Faith', 'Grace', 'Cynthia', 'Nasra'],
  },
  Tanzania: {
    male: ['Juma', 'Hamisi', 'Baraka', 'Rashid', 'Salim', 'Diamond', 'Ali', 'Musa', 'Emmanuel', 'Frank'],
    female: ['Zuhura', 'Amina', 'Fatuma', 'Neema', 'Rehema', 'Halima', 'Asha', 'Vanessa', 'Judith', 'Rose'],
  },
  Cameroon: {
    male: ['Alain', 'Blaise', 'Cédric', 'Emmanuel', 'Franck', 'Georges', 'Hervé', 'Joël', 'Koffi', 'Landry'],
    female: ['Aïcha', 'Brigitte', 'Chantal', 'Diane', 'Estelle', 'Francine', 'Ghislaine', 'Hélène', 'Irène', 'Josiane'],
  },
  'DR Congo': {
    male: ['Fiston', 'Papy', 'Blaise', 'Christian', 'Didier', 'Junior', 'Serge', 'Patrick', 'Guy', 'Bienvenu'],
    female: ['Grâce', 'Bénédicte', 'Chantal', 'Divine', 'Esther', 'Fifi', 'Gloria', 'Josée', 'Mireille', 'Nadine'],
  },
  Uganda: {
    male: ['Moses', 'Ssebunya', 'Kato', 'Ochieng', 'Byaruhanga', 'Eddy', 'Jose', 'Navio', 'Fefé', 'Denis'],
    female: ['Nabukenya', 'Sarah', 'Winnie', 'Juliana', 'Patricia', 'Brenda', 'Sheila', 'Remah', 'Lydia', 'Sandra'],
  },
  Angola: {
    male: ['Anselmo', 'Bruno', 'Carlos', 'Domingos', 'Eduardo', 'Fábio', 'Gilberto', 'Hélder', 'Ivo', 'Jorge'],
    female: ['Ana', 'Beatriz', 'Cátia', 'Domingas', 'Eunice', 'Filomena', 'Graça', 'Helena', 'Isabel', 'Joana'],
  },
  Egypt: {
    male: ['Ahmed', 'Mohamed', 'Mahmoud', 'Youssef', 'Omar', 'Karim', 'Tarek', 'Hassan', 'Ali', 'Mostafa'],
    female: ['Fatma', 'Aya', 'Mona', 'Sara', 'Nour', 'Hana', 'Dina', 'Rana', 'Yasmin', 'Layla'],
  },
  Morocco: {
    male: ['Youssef', 'Mehdi', 'Omar', 'Hamza', 'Anas', 'Bilal', 'Ayoub', 'Rachid', 'Karim', 'Yassine'],
    female: ['Salma', 'Imane', 'Yasmine', 'Hind', 'Nada', 'Sara', 'Ghita', 'Lina', 'Amal', 'Maryam'],
  },
  Algeria: {
    male: ['Amine', 'Bilal', 'Djamel', 'Fares', 'Hakim', 'Idris', 'Karim', 'Mehdi', 'Nabil', 'Riad'],
    female: ['Amina', 'Cherifa', 'Djamila', 'Fatima', 'Hania', 'Imane', 'Kahina', 'Lila', 'Nadia', 'Samira'],
  },
  Tunisia: {
    male: ['Amine', 'Bilel', 'Chokri', 'Fedi', 'Hatem', 'Ilyes', 'Mehdi', 'Nizar', 'Sami', 'Walid'],
    female: ['Amira', 'Dorra', 'Emna', 'Hela', 'Ines', 'Jamila', 'Marwa', 'Nour', 'Rim', 'Salma'],
  },
  Ethiopia: {
    male: ['Abel', 'Bereket', 'Dawit', 'Eyob', 'Getachew', 'Haftom', 'Kebede', 'Mulugeta', 'Tesfaye', 'Yonas'],
    female: ['Aster', 'Bethlehem', 'Chernet', 'Eden', 'Genet', 'Hiwot', 'Liya', 'Marta', 'Selam', 'Tigist'],
  },
  Senegal: {
    male: ['Abdoulaye', 'Babacar', 'Cheikh', 'Daouda', 'El Hadji', 'Fallou', 'Ibrahima', 'Lamine', 'Moussa', 'Ousmane'],
    female: ['Aïssatou', 'Bineta', 'Coumba', 'Dieynaba', 'Fatou', 'Khady', 'Mariama', 'Ndèye', 'Rokhaya', 'Sokhna'],
  },
  'Ivory Coast': {
    male: ['Aboubakar', 'Bakary', 'Cédric', 'Didier', 'Franck', 'Kouassi', 'Kouadio', 'Serge', 'Yao', 'Zéphirin'],
    female: ['Adjoua', 'Awa', 'Céline', 'Djeneba', 'Fatoumata', 'Grâce', 'Kadidja', 'Nadège', 'Rebecca', 'Yasmine'],
  },
  Jamaica: {
    male: ['Devon', 'Everton', 'Garfield', 'Horace', 'Junior', 'Kirk', 'Omar', 'Rohan', 'Shane', 'Winston'],
    female: ['Althea', 'Camille', 'Denise', 'Georgia', 'Jodi', 'Kadeisha', 'Marsha', 'Sherine', 'Sophia', 'Tanya'],
  },
  Brazil: {
    male: ['Alexandre', 'Bruno', 'Caio', 'Diego', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'João', 'Lucas'],
    female: ['Ana', 'Beatriz', 'Camila', 'Daniela', 'Fernanda', 'Gabriela', 'Isabela', 'Juliana', 'Larissa', 'Mariana'],
  },
  'Puerto Rico': {
    male: ['Ángel', 'Carlos', 'Dariel', 'Edwin', 'Héctor', 'José', 'Luis', 'Miguel', 'Rafael', 'Wilson'],
    female: ['Alondra', 'Bianca', 'Carolina', 'Darlene', 'Gabriela', 'Ivonne', 'Juliana', 'Kiara', 'Nayeli', 'Yaritza'],
  },
  Mexico: {
    male: ['Alejandro', 'Bruno', 'Carlos', 'Diego', 'Emiliano', 'Fernando', 'Gael', 'Héctor', 'Javier', 'Rodrigo'],
    female: ['Alejandra', 'Brenda', 'Camila', 'Daniela', 'Estefanía', 'Fernanda', 'Guadalupe', 'Itzel', 'Lucía', 'Valeria'],
  },
  Colombia: {
    male: ['Andrés', 'Camilo', 'Diego', 'Esteban', 'Felipe', 'Julián', 'Mateo', 'Nicolás', 'Sebastián', 'Santiago'],
    female: ['Alejandra', 'Camila', 'Daniela', 'Isabella', 'Juliana', 'Laura', 'Manuela', 'Sara', 'Valentina', 'Yuliana'],
  },
  France: {
    male: ['Antoine', 'Bilal', 'Cédric', 'Driss', 'Étienne', 'Hugo', 'Karim', 'Mehdi', 'Rachid', 'Yanis'],
    female: ['Amel', 'Camille', 'Chloé', 'Fatou', 'Inès', 'Léa', 'Naïma', 'Sarah', 'Yasmine', 'Zoé'],
  },
  Germany: {
    male: ['Ahmet', 'Bastian', 'Deniz', 'Emre', 'Jannik', 'Luca', 'Maximilian', 'Samir', 'Tim', 'Yusuf'],
    female: ['Amira', 'Anke', 'Ceyda', 'Elif', 'Hanna', 'Julia', 'Lena', 'Mia', 'Sophie', 'Zeynep'],
  },
  Netherlands: {
    male: ['Bilal', 'Daan', 'Ibrahim', 'Jayden', 'Lars', 'Memphis', 'Rayan', 'Sven', 'Thijs', 'Youssef'],
    female: ['Aya', 'Emma', 'Fenna', 'Isa', 'Lotte', 'Nadia', 'Sanne', 'Sofia', 'Yara', 'Zeynep'],
  },
  Spain: {
    male: ['Alejandro', 'Bruno', 'Carlos', 'Diego', 'Enrique', 'Javier', 'Marcos', 'Pablo', 'Sergio', 'Tomás'],
    female: ['Alba', 'Carmen', 'Elena', 'Irene', 'Lucía', 'Marta', 'Nerea', 'Paula', 'Sara', 'Valeria'],
  },
  Italy: {
    male: ['Alessandro', 'Davide', 'Federico', 'Giovanni', 'Lorenzo', 'Marco', 'Matteo', 'Riccardo', 'Simone', 'Tommaso'],
    female: ['Alessia', 'Chiara', 'Elena', 'Federica', 'Giulia', 'Martina', 'Sara', 'Sofia', 'Valentina', 'Vittoria'],
  },
  Portugal: {
    male: ['André', 'Bruno', 'Diogo', 'Gonçalo', 'João', 'Miguel', 'Nuno', 'Pedro', 'Rui', 'Tiago'],
    female: ['Ana', 'Beatriz', 'Carolina', 'Inês', 'Leonor', 'Margarida', 'Mariana', 'Matilde', 'Sofia', 'Teresa'],
  },
  Poland: {
    male: ['Adam', 'Bartosz', 'Damian', 'Jakub', 'Kacper', 'Kamil', 'Mateusz', 'Michał', 'Piotr', 'Tomasz'],
    female: ['Agnieszka', 'Aleksandra', 'Ewa', 'Julia', 'Katarzyna', 'Magda', 'Natalia', 'Ola', 'Weronika', 'Zuzanna'],
  },
  Russia: {
    male: ['Aleksandr', 'Dmitri', 'Ivan', 'Kirill', 'Maksim', 'Nikolai', 'Sergei', 'Timur', 'Vadim', 'Yegor'],
    female: ['Anastasia', 'Daria', 'Ekaterina', 'Irina', 'Ksenia', 'Maria', 'Natalia', 'Olga', 'Svetlana', 'Vera'],
  },
  Sweden: {
    male: ['Albin', 'Elias', 'Felix', 'Hugo', 'Isak', 'Liam', 'Oscar', 'Rami', 'Viktor', 'Yasin'],
    female: ['Alva', 'Elsa', 'Freja', 'Ida', 'Linnea', 'Maja', 'Nora', 'Saga', 'Tilda', 'Wilma'],
  },
  Norway: {
    male: ['Aksel', 'Emil', 'Henrik', 'Jonas', 'Kristian', 'Magnus', 'Ola', 'Sander', 'Tobias', 'Vetle'],
    female: ['Astrid', 'Emilie', 'Frida', 'Ingrid', 'Kristine', 'Marte', 'Nora', 'Sofie', 'Thea', 'Ylva'],
  },
  Denmark: {
    male: ['Anders', 'Casper', 'Emil', 'Frederik', 'Jonas', 'Magnus', 'Mikkel', 'Oliver', 'Rasmus', 'Villads'],
    female: ['Agnes', 'Clara', 'Emma', 'Freja', 'Ida', 'Josefine', 'Laura', 'Maja', 'Sofie', 'Alma'],
  },
  Ireland: {
    male: ['Cian', 'Conor', 'Darragh', 'Eoin', 'Fionn', 'Liam', 'Oisín', 'Ronan', 'Sean', 'Tadhg'],
    female: ['Aoife', 'Ciara', 'Emer', 'Fiona', 'Niamh', 'Orla', 'Saoirse', 'Sinéad', 'Sorcha', 'Úna'],
  },
  Canada: {
    male: ['Aiden', 'Curtis', 'Deshaun', 'Ethan', 'Jayden', 'Liam', 'Marcus', 'Noah', 'Tyler', 'Xavier'],
    female: ['Aaliyah', 'Chloe', 'Emma', 'Imani', 'Jasmine', 'Kiana', 'Maya', 'Nia', 'Olivia', 'Zara'],
  },
  India: {
    male: ['Aarav', 'Arjun', 'Dev', 'Ishaan', 'Kabir', 'Rohan', 'Rahul', 'Siddharth', 'Vikram', 'Yash'],
    female: ['Aditi', 'Ananya', 'Diya', 'Isha', 'Kavya', 'Meera', 'Neha', 'Priya', 'Riya', 'Sanya'],
  },
  Pakistan: {
    male: ['Ali', 'Bilal', 'Danish', 'Faisal', 'Hamza', 'Imran', 'Kamran', 'Saad', 'Usman', 'Zain'],
    female: ['Ayesha', 'Fatima', 'Hira', 'Iqra', 'Mahnoor', 'Maryam', 'Nadia', 'Rabia', 'Sana', 'Zara'],
  },
  Bangladesh: {
    male: ['Arif', 'Fahim', 'Hasan', 'Imran', 'Jubayer', 'Mahmud', 'Rakib', 'Shakib', 'Tanvir', 'Zahid'],
    female: ['Afsana', 'Bushra', 'Farhana', 'Jannat', 'Maliha', 'Nusrat', 'Rima', 'Sabrina', 'Tasnim', 'Zarin'],
  },
  China: {
    male: ['Bo', 'Chen', 'Hao', 'Jian', 'Lei', 'Ming', 'Tao', 'Wei', 'Xiang', 'Zhi'],
    female: ['Fang', 'Hong', 'Jia', 'Lan', 'Li', 'Mei', 'Na', 'Qing', 'Xiu', 'Yun'],
  },
  Japan: {
    male: ['Haruto', 'Hiroto', 'Kaito', 'Kenji', 'Ren', 'Riku', 'Sota', 'Takumi', 'Yuki', 'Yuto'],
    female: ['Aiko', 'Hana', 'Hinata', 'Mei', 'Rin', 'Sakura', 'Sora', 'Yui', 'Yuna', 'Aoi'],
  },
  'South Korea': {
    male: ['Doyun', 'Hyunwoo', 'Jihoon', 'Junseo', 'Minjun', 'Seojun', 'Siwoo', 'Taeyang', 'Woojin', 'Yujun'],
    female: ['Chaewon', 'Daeun', 'Haeun', 'Jimin', 'Minseo', 'Somin', 'Sua', 'Yejin', 'Yuna', 'Hyunjin'],
  },
  Thailand: {
    male: ['Anan', 'Boonmee', 'Chatri', 'Decha', 'Kittisak', 'Niran', 'Prasert', 'Somchai', 'Thanawat', 'Wirat'],
    female: ['Achara', 'Busaba', 'Chanida', 'Duangjai', 'Kanya', 'Malee', 'Napaporn', 'Pimchan', 'Siriporn', 'Wanida'],
  },
  Vietnam: {
    male: ['Anh', 'Bao', 'Cuong', 'Duc', 'Hieu', 'Khánh', 'Minh', 'Nam', 'Quan', 'Tuan'],
    female: ['Chi', 'Hà', 'Lan', 'Linh', 'Mai', 'Ngọc', 'Phương', 'Thảo', 'Trang', 'Yến'],
  },
  Indonesia: {
    male: ['Adi', 'Budi', 'Dimas', 'Eko', 'Fajar', 'Hendra', 'Iwan', 'Rizky', 'Surya', 'Yoga'],
    female: ['Anisa', 'Citra', 'Dewi', 'Fitri', 'Indah', 'Kartika', 'Maya', 'Putri', 'Sari', 'Wulan'],
  },
  Philippines: {
    male: ['Andres', 'Benigno', 'Carlos', 'Diego', 'Emilio', 'Jose', 'Manny', 'Ramon', 'Rico', 'Tomas'],
    female: ['Andrea', 'Angelica', 'Bea', 'Camille', 'Diana', 'Isabel', 'Jasmine', 'Kathryn', 'Mariel', 'Rosalie'],
  },
  Malaysia: {
    male: ['Adib', 'Amir', 'Faizal', 'Hafiz', 'Irfan', 'Kamal', 'Rizal', 'Syafiq', 'Zul', 'Hakim'],
    female: ['Aina', 'Diana', 'Farah', 'Hana', 'Izzah', 'Melati', 'Nadia', 'Siti', 'Yasmin', 'Zulaikha'],
  },
  Turkey: {
    male: ['Ahmet', 'Burak', 'Cem', 'Emre', 'Kaan', 'Murat', 'Onur', 'Serkan', 'Tolga', 'Yusuf'],
    female: ['Aylin', 'Bahar', 'Ceren', 'Defne', 'Elif', 'Gizem', 'Melis', 'Selin', 'Yasemin', 'Zeynep'],
  },
  Argentina: {
    male: ['Agustín', 'Bruno', 'Diego', 'Facundo', 'Gonzalo', 'Joaquín', 'Matías', 'Nicolás', 'Santiago', 'Tomás'],
    female: ['Camila', 'Florencia', 'Guadalupe', 'Julieta', 'Lucía', 'Martina', 'Milagros', 'Sofía', 'Valentina', 'Zoe'],
  },
  Chile: {
    male: ['Benjamín', 'Cristóbal', 'Diego', 'Felipe', 'Ignacio', 'Joaquín', 'Matías', 'Nicolás', 'Sebastián', 'Vicente'],
    female: ['Antonia', 'Catalina', 'Constanza', 'Emilia', 'Fernanda', 'Isidora', 'Javiera', 'Martina', 'Sofía', 'Valentina'],
  },
  Peru: {
    male: ['Adriano', 'Bruno', 'Diego', 'Fernando', 'Gonzalo', 'Jorge', 'Luis', 'Renato', 'Sebastián', 'Thiago'],
    female: ['Alessandra', 'Camila', 'Daniela', 'Fernanda', 'Luciana', 'Micaela', 'Nicole', 'Rafaela', 'Valeria', 'Ximena'],
  },
  'Dominican Republic': {
    male: ['Alberto', 'Bryan', 'Carlos', 'Emanuel', 'Franklin', 'Jhon', 'Luis', 'Rafael', 'Starling', 'Wander'],
    female: ['Altagracia', 'Carolina', 'Dulce', 'Estefany', 'Josefina', 'Katherine', 'Mariela', 'Nurys', 'Rosanna', 'Yaneris'],
  },
  Cuba: {
    male: ['Alejandro', 'Carlos', 'Dayron', 'Ernesto', 'Frank', 'Jorge', 'Lázaro', 'Osvaldo', 'Reinier', 'Yunior'],
    female: ['Aymara', 'Caridad', 'Dayana', 'Elena', 'Grisel', 'Ileana', 'Marlene', 'Niurka', 'Yanet', 'Zulema'],
  },
  'Trinidad': {
    male: ['Aaron', 'Bunji', 'Dexter', 'Kes', 'Machel', 'Neil', 'Olutunji', 'Rikki', 'Sekon', 'Yohan'],
    female: ['Anika', 'Destra', 'Fay-Ann', 'Jade', 'Karene', 'Nadia', 'Patrice', 'Sakile', 'Terri', 'Wendy'],
  },
  Haiti: {
    male: ['BélO', 'Djakout', 'Emmanuel', 'Frantz', 'Jean', 'Kreyòl', 'Louinel', 'Mizik', 'Roody', 'Widmaer'],
    female: ['Anite', 'Darline', 'Fabienne', 'Gaëlle', 'Jocelyne', 'Leyla', 'Melissa', 'Naïka', 'Sherlee', 'Yvonne'],
  },
  Barbados: {
    male: ['Alison', 'Anderson', 'Edwin', 'Kirk', 'Lil Rick', 'Peter', 'Rupee', 'Shontelle', 'Smokey', 'Tim'],
    female: ['Alison', 'Carlyn', 'Denise', 'Haley', 'Jasmine', 'Kara', 'Leandra', 'Natahsha', 'Rihanna', 'Shontelle'],
  },
  Botswana: {
    male: ['Bafana', 'Ditiro', 'Kabelo', 'Katlego', 'Mpho', 'Neo', 'Thabo', 'Tshepo', 'Tumisang', 'Vusi'],
    female: ['Boitumelo', 'Dineo', 'Kefilwe', 'Lorato', 'Naledi', 'Onthatile', 'Refilwe', 'Tebogo', 'Warona', 'Zanele'],
  },
  Namibia: {
    male: ['Absalom', 'Bernard', 'Dawid', 'Erastus', 'Gabriel', 'Hendrik', 'Josef', 'Paulus', 'Tangeni', 'Willem'],
    female: ['Anna', 'Beata', 'Ester', 'Helena', 'Johanna', 'Lahja', 'Maria', 'Ndapewa', 'Selma', 'Tulela'],
  },
  Zambia: {
    male: ['Bwalya', 'Chanda', 'Chileshe', 'Kabwe', 'Lungu', 'Mulenga', 'Mwamba', 'Sakala', 'Tembo', 'Zulu'],
    female: ['Bwalya', 'Chileshe', 'Chipo', 'Lweendo', 'Misozi', 'Mutinta', 'Namakau', 'Nyambe', 'Sibeso', 'Thandiwe'],
  },
  Zimbabwe: {
    male: ['Blessing', 'Farai', 'Kudakwashe', 'Munyaradzi', 'Nyasha', 'Simba', 'Tafadzwa', 'Takudzwa', 'Tendai', 'Wesley'],
    female: ['Chipo', 'Fadzai', 'Kudzai', 'Nyasha', 'Rudo', 'Rutendo', 'Tanyaradzwa', 'Tendai', 'Vimbai', 'Zvikomborero'],
  },
  Rwanda: {
    male: ['Bruce', 'Christian', 'Emmanuel', 'Fabrice', 'Gaston', 'Jean', 'Kevin', 'Meddy', 'Patrick', 'Theoneste'],
    female: ['Alice', 'Chantal', 'Diane', 'Grace', 'Immaculée', 'Josiane', 'Keza', 'Nadia', 'Sandrine', 'Uwase'],
  },
  'Burkina Faso': {
    male: ['Adama', 'Boukary', 'Issa', 'Lassina', 'Moussa', 'Oumarou', 'Salif', 'Seydou', 'Yacouba', 'Zakaria'],
    female: ['Awa', 'Bintou', 'Fatimata', 'Hawa', 'Kadiatou', 'Mariam', 'Rasmata', 'Safiatou', 'Tenin', 'Zenabou'],
  },
  Mali: {
    male: ['Adama', 'Boubacar', 'Drissa', 'Ibrahim', 'Lassana', 'Modibo', 'Oumar', 'Salif', 'Seydou', 'Yaya'],
    female: ['Aminata', 'Assitan', 'Djeneba', 'Fatoumata', 'Kadiatou', 'Mariam', 'Nana', 'Oumou', 'Rokia', 'Sitan'],
  },
  Mozambique: {
    male: ['Afonso', 'Bernardo', 'Carlos', 'Domingos', 'Eusébio', 'Fernando', 'Joaquim', 'Luís', 'Mário', 'Paulo'],
    female: ['Albertina', 'Carla', 'Dulce', 'Elisa', 'Fátima', 'Glória', 'Ilda', 'Luísa', 'Maria', 'Selma'],
  },
  Australia: {
    male: ['Angus', 'Bailey', 'Cooper', 'Flynn', 'Harrison', 'Jack', 'Lachlan', 'Riley', 'Tyler', 'Zane'],
    female: ['Chloe', 'Ella', 'Grace', 'Isla', 'Mia', 'Ruby', 'Sienna', 'Tahlia', 'Willow', 'Zoe'],
  },
  'New Zealand': {
    male: ['Ari', 'Hemi', 'Jack', 'Liam', 'Manu', 'Nikau', 'Rangi', 'Tane', 'Toby', 'Wiremu'],
    female: ['Aroha', 'Awhina', 'Charlotte', 'Hine', 'Isla', 'Kiri', 'Maia', 'Moana', 'Ruby', 'Sophie'],
  },
  UAE: {
    male: ['Ahmed', 'Faisal', 'Hamdan', 'Khalid', 'Mansour', 'Omar', 'Rashid', 'Saif', 'Sultan', 'Zayed'],
    female: ['Amal', 'Fatima', 'Hessa', 'Latifa', 'Mariam', 'Noura', 'Reem', 'Salama', 'Shamma', 'Sheikha'],
  },
  'Saudi Arabia': {
    male: ['Abdullah', 'Faisal', 'Khalid', 'Majed', 'Mohammed', 'Nawaf', 'Omar', 'Salman', 'Turki', 'Yazeed'],
    female: ['Aljawharah', 'Amjad', 'Deema', 'Hala', 'Lama', 'Nouf', 'Reem', 'Sarah', 'Shahad', 'Wafa'],
  },
};

const DEFAULT_NAMES = {
  male: ['Alex', 'Daniel', 'Lucas', 'Marco', 'Yuki', 'Hiro', 'Diego', 'Mateo', 'Hugo', 'Felix',
         'Jonas', 'Erik', 'Adam', 'Rayan', 'Karim', 'Omar', 'Ravi', 'Arjun', 'Kenji', 'Lars'],
  female: ['Sofia', 'Emma', 'Lena', 'Yuna', 'Aiko', 'Camila', 'Valentina', 'Ingrid', 'Freya', 'Amelie',
           'Noor', 'Lina', 'Priya', 'Ananya', 'Mei', 'Hana', 'Isabel', 'Clara', 'Maja', 'Elif'],
};

const SURNAMES: Record<string, string[]> = {
  Ghana: ['Mensah', 'Boateng', 'Osei', 'Asante', 'Owusu', 'Appiah', 'Addo', 'Agyeman', 'Darko', 'Amoah',
          'Sarpong', 'Nkrumah', 'Annan', 'Quaye', 'Tetteh', 'Lartey', 'Adjei', 'Frimpong', 'Gyasi', 'Yeboah'],
  Nigeria: ['Okafor', 'Adeyemi', 'Okonkwo', 'Balogun', 'Eze', 'Ogunleye', 'Nwosu', 'Adebayo', 'Chukwu', 'Olawale',
            'Ibrahim', 'Musa', 'Afolabi', 'Obi', 'Nnamdi', 'Bello', 'Ojo', 'Uche', 'Duru', 'Alabi'],
  'South Africa': ['Nkosi', 'Dlamini', 'Ndlovu', 'Khumalo', 'Mokoena', 'Zulu', 'Mahlangu', 'Sithole', 'Mbeki', 'Molefe',
                   'Ntuli', 'Radebe', 'Mabaso', 'Tshabalala', 'Naidoo', 'Pillay', 'Botha', 'Van Wyk', 'Jacobs', 'Adams'],
  USA: ['Johnson', 'Williams', 'Brown', 'Jackson', 'Davis', 'Washington', 'Jefferson', 'Carter', 'Coleman', 'Banks',
        'Freeman', 'Hayes', 'Wallace', 'Booker', 'Rivers', 'Grant', 'Parker', 'Reed', 'Simmons', 'Tucker'],
  UK: ['Smith', 'Adeyemi', 'Clarke', 'Bennett', 'Okoro', 'Walsh', 'Turner', 'Reid', 'Grant', 'Boateng',
       'Hughes', 'Palmer', 'Cox', 'Doyle', 'Mensah', 'Osei', 'Barnes', 'Webb', 'Fisher', 'Kaur'],
  Kenya: ['Mwangi', 'Otieno', 'Kamau', 'Njoroge', 'Ochieng', 'Wanjiru', 'Kipchoge', 'Mutua', 'Onyango', 'Wafula'],
  Tanzania: ['Mwinyi', 'Juma', 'Hassan', 'Mkapa', 'Kikwete', 'Msuya', 'Nyerere', 'Salum', 'Mbwana', 'Kimaro'],
  Cameroon: ['Nkoulou', 'Mbia', 'Anguissa', 'Toko', 'Onana', 'Aboubakar', 'Etoo', 'Mouelle', 'Fofana', 'Nguema'],
  'DR Congo': ['Lukaku', 'Mbokani', 'Mbemba', 'Bakambu', 'Bolingi', 'Wissa', 'Kalonji', 'Kasongo', 'Lokonda', 'Mukendi'],
  Uganda: ['Museveni', 'Ssebunya', 'Nabukenya', 'Byaruhanga', 'Kato', 'Ochieng', 'Wamala', 'Namukasa', 'Ssekandi', 'Kagwa'],
  Angola: ['Dos Santos', 'Lourenço', 'Neto', 'Miala', 'Cardoso', 'Dala', 'Chivukuvuku', 'Kambundji', 'Manuel', 'Nascimento'],
  Egypt: ['Abdelrahman', 'Hassan', 'Ibrahim', 'Mahmoud', 'Mostafa', 'Nasser', 'Salah', 'Selim', 'Zaki', 'Farouk'],
  Morocco: ['Alaoui', 'Amrani', 'Benali', 'Bennani', 'Chraibi', 'El Amrani', 'Fassi', 'Idrissi', 'Lahlou', 'Tazi'],
  Algeria: ['Benali', 'Bouteflika', 'Boumediene', 'Chatel', 'Hamdi', 'Khelifi', 'Larbi', 'Meziane', 'Salhi', 'Zerrouki'],
  Tunisia: ['Ben Ali', 'Bouazizi', 'Chaabane', 'Gharbi', 'Hamdi', 'Jelassi', 'Karoui', 'Mejri', 'Sassi', 'Trabelsi'],
  Ethiopia: ['Abebe', 'Alemayehu', 'Bekele', 'Desta', 'Gebremariam', 'Haile', 'Kebede', 'Mekonnen', 'Tesfaye', 'Yohannes'],
  Senegal: ['Diop', 'Fall', 'Faye', 'Gueye', 'Mbaye', 'Ndiaye', 'Sall', 'Seck', 'Sow', 'Sy'],
  'Ivory Coast': ['Koné', 'Kouassi', 'Yao', 'Bamba', 'Traoré', 'Coulibaly', 'Diallo', 'Gbagbo', 'Ouattara', 'Zoro'],
  Jamaica: ['Brown', 'Campbell', 'Clarke', 'Grant', 'Henry', 'Johnson', 'Morgan', 'Palmer', 'Reid', 'Williams'],
  Brazil: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Nascimento'],
  'Puerto Rico': ['Rivera', 'Rodríguez', 'Santiago', 'Ortiz', 'Morales', 'Vargas', 'Cruz', 'Reyes', 'Torres', 'Díaz'],
  Mexico: ['Hernández', 'García', 'Martínez', 'López', 'González', 'Pérez', 'Ramírez', 'Torres', 'Flores', 'Rivera'],
  Colombia: ['Rodríguez', 'Gómez', 'Gutiérrez', 'Moreno', 'Jiménez', 'Vargas', 'Castro', 'Rojas', 'Ortiz', 'Restrepo'],
  France: ['Dubois', 'Lefebvre', 'Moreau', 'Bernard', 'Petit', 'Robert', 'Richard', 'Durand', 'Diallo', 'Benali'],
  Germany: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Yildirim', 'Kaya'],
  Netherlands: ['De Jong', 'Van Dijk', 'Bakker', 'Visser', 'Smit', 'Meijer', 'El Amrani', 'Hassan', 'Vermeer', 'Yilmaz'],
  Spain: ['García', 'Rodríguez', 'Martínez', 'López', 'Sánchez', 'Fernández', 'Gómez', 'Ruiz', 'Torres', 'Molina'],
  Italy: ['Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci', 'Marino', 'Greco'],
  Portugal: ['Silva', 'Santos', 'Ferreira', 'Pereira', 'Oliveira', 'Costa', 'Rodrigues', 'Martins', 'Sousa', 'Almeida'],
  Poland: ['Nowak', 'Kowalski', 'Wiśniewski', 'Wójcik', 'Kowalczyk', 'Kamiński', 'Lewandowski', 'Zieliński', 'Szymański', 'Dąbrowski'],
  Russia: ['Ivanov', 'Petrov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov'],
  Sweden: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson'],
  Norway: ['Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Pedersen', 'Nilsen', 'Kristiansen', 'Jensen', 'Karlsen'],
  Denmark: ['Nielsen', 'Jensen', 'Hansen', 'Pedersen', 'Andersen', 'Christensen', 'Larsen', 'Sørensen', 'Rasmussen', 'Jørgensen'],
  Ireland: ['Murphy', 'Kelly', 'OBrien', 'Walsh', 'OSullivan', 'Byrne', 'Ryan', 'OConnor', 'ONeill', 'Kennedy'],
  Canada: ['Smith', 'Brown', 'Tremblay', 'Martin', 'Roy', 'Wilson', 'Johnson', 'MacDonald', 'Taylor', 'Anderson'],
  India: ['Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Nair', 'Iyer', 'Gupta', 'Mehta'],
  Pakistan: ['Khan', 'Ahmed', 'Malik', 'Sheikh', 'Butt', 'Chaudhry', 'Hussain', 'Iqbal', 'Qureshi', 'Raza'],
  Bangladesh: ['Rahman', 'Hossain', 'Islam', 'Ahmed', 'Chowdhury', 'Khan', 'Akter', 'Sarker', 'Mia', 'Uddin'],
  China: ['Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou'],
  Japan: ['Sato', 'Suzuki', 'Takahashi', 'Tanaka', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato'],
  'South Korea': ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim'],
  Thailand: ['Saetang', 'Chaiyaporn', 'Suwan', 'Boonmee', 'Rattanakorn', 'Wongchai', 'Srisai', 'Thongchai', 'Inthara', 'Phromma'],
  Vietnam: ['Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Huynh', 'Phan', 'Vu', 'Dang', 'Bui'],
  Indonesia: ['Santoso', 'Wijaya', 'Kusuma', 'Hidayat', 'Nugroho', 'Setiawan', 'Pratama', 'Susanto', 'Gunawan', 'Saputra'],
  Philippines: ['Santos', 'Reyes', 'Cruz', 'Bautista', 'Garcia', 'Mendoza', 'Aquino', 'Ramos', 'Villanueva', 'Dela Cruz'],
  Malaysia: ['Abdullah', 'Ibrahim', 'Hassan', 'Ahmad', 'Ismail', 'Rahman', 'Yusof', 'Zainal', 'Osman', 'Rahim'],
  Turkey: ['Yılmaz', 'Kaya', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Yıldırım', 'Öztürk', 'Aydın', 'Özdemir'],
  Argentina: ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Pérez', 'Gómez', 'Díaz', 'Álvarez', 'Romero'],
  Chile: ['González', 'Muñoz', 'Rojas', 'Díaz', 'Pérez', 'Soto', 'Contreras', 'Silva', 'Martínez', 'Sepúlveda'],
  Peru: ['Quispe', 'Flores', 'Sánchez', 'Huamán', 'García', 'Rodríguez', 'Chávez', 'Vásquez', 'Rojas', 'Mamani'],
  'Dominican Republic': ['Peña', 'Rodríguez', 'Martínez', 'Reyes', 'De la Cruz', 'Santos', 'Guzmán', 'Ramírez', 'Núñez', 'Castillo'],
  Cuba: ['Rodríguez', 'Pérez', 'González', 'García', 'Martínez', 'Fernández', 'López', 'Díaz', 'Hernández', 'Valdés'],
  'Trinidad': ['Joseph', 'Charles', 'Williams', 'Baptiste', 'Ramdeen', 'Boodoo', 'Persad', 'Alexander', 'Grant', 'Mohammed'],
  Haiti: ['Jean-Baptiste', 'Pierre', 'Charles', 'Louis', 'Joseph', 'Étienne', 'Dorval', 'Beauvais', 'Fils-Aimé', 'Cadet'],
  Barbados: ['Clarke', 'Brathwaite', 'Holder', 'Forde', 'Blackman', 'Bishop', 'Greaves', 'Weekes', 'Springer', 'Best'],
  Botswana: ['Molefe', 'Kgosi', 'Sebego', 'Tshosa', 'Keitumetse', 'Mogwe', 'Kebonang', 'Ramosweu', 'Molebatsi', 'Tlhage'],
  Namibia: ['Shikongo', 'Amukwaya', 'Nghidinwa', 'Hamutenya', 'Katjivena', 'Nghishililwa', 'Uusiku', 'Kandjii', 'Geingob', 'Haufiku'],
  Zambia: ['Banda', 'Phiri', 'Mwansa', 'Chanda', 'Lungu', 'Mulenga', 'Sakala', 'Tembo', 'Zulu', 'Chileshe'],
  Zimbabwe: ['Moyo', 'Ncube', 'Sibanda', 'Dube', 'Mpofu', 'Chikwanha', 'Mhlanga', 'Nyathi', 'Mabhena', 'Zhou'],
  Rwanda: ['Mukamana', 'Habimana', 'Niyonzima', 'Uwimana', 'Munyaneza', 'Uwase', 'Gasana', 'Kagabo', 'Nkurunziza', 'Bizimana'],
  'Burkina Faso': ['Ouédraogo', 'Sawadogo', 'Kaboré', 'Compaoré', 'Zongo', 'Traoré', 'Bationo', 'Nikiéma', 'Kaboré', 'Ilboudo'],
  Mali: ['Traoré', 'Coulibaly', 'Keita', 'Diarra', 'Touré', 'Konaté', 'Sidibé', 'Doumbia', 'Cissé', 'Bagayoko'],
  Mozambique: ['Machel', 'Chissano', 'Guebuza', 'Nyusi', 'Sitoe', 'Mabote', 'Nhaca', 'Chivambo', 'Macuácua', 'Zimba'],
  Australia: ['Smith', 'Jones', 'Williams', 'Brown', 'Wilson', 'Taylor', 'Nguyen', 'Martin', 'White', 'Anderson'],
  'New Zealand': ['Smith', 'Williams', 'Wilson', 'Taylor', 'King', 'Brown', 'Thompson', 'Ngata', 'Parata', 'Walker'],
  UAE: ['Al Maktoum', 'Al Nahyan', 'Al Falasi', 'Al Marri', 'Al Suwaidi', 'Al Zaabi', 'Al Mansoori', 'Al Hammadi', 'Al Ketbi', 'Al Shamsi'],
  'Saudi Arabia': ['Al Saud', 'Al Otaibi', 'Al Qahtani', 'Al Ghamdi', 'Al Shehri', 'Al Harbi', 'Al Dossari', 'Al Zahrani', 'Al Mutairi', 'Al Anazi'],
};

const DEFAULT_SURNAMES = ['Silva', 'Kim', 'Tanaka', 'Nakamura', 'Garcia', 'Martinez', 'Rossi', 'Dubois', 'Müller', 'Novak',
                          'Larsen', 'Berg', 'Kaur', 'Patel', 'Ahmed', 'Hassan', 'Park', 'Chen', 'Oliveira', 'Santos'];

// ─── FLAVOUR POOLS ────────────────────────────────────────────────────────

const PERSONALITY_TRAITS = [
  'ambitious', 'arrogant', 'humble', 'loyal', 'passionate', 'calculating', 'generous', 'petty',
  'creative', 'spiritual', 'selective', 'reckless', 'disciplined', 'charming', 'paranoid', 'ruthless',
  'image_conscious', 'brutally_honest', 'easygoing', 'workaholic', 'volatile', 'strategic', 'idealistic', 'cynical',
];

const GENRES: Genre[] = ROSTER_GENRES;

const PRODUCER_PREFIX = ['Killa', 'Young', 'Dr.', 'Big', 'Lil', 'Mello', 'Supa', 'DJ', 'Master', 'Jnr',
                         'Mad', 'Slim', 'Ice', 'Nasty', 'Slick', 'Prime', 'Ghost', 'Savage', 'Loco', 'Vibes',
                         'Chill', 'Deep', 'Blaze', 'Sharp', 'Smooth', 'Wild', 'Cold', 'Dusty', 'Electric', 'Neon'];
const PRODUCER_SUFFIX = ['Beats', 'OnTheTrack', 'Sounds', 'Wavez', 'Keys', 'Mix', 'Instrumentals', 'TheProducer',
                         'Productions', 'Studio', 'Lab', 'Sessions', 'Records', 'Audio', 'Music', 'Tracks',
                         'Engine', 'Vault', 'Theory', 'Machine'];

// ─── ARTIST ALIASES ────────────────────────────────────────────────────────
//
// Almost no rapper or singer performs under their legal name, so a generated
// artist should not either. Without these, the world filled up with "Kwesi
// Adjei" and "Franke Mwinyi" — perfectly good names, and completely wrong on a
// marquee. The plain name is kept as `realName` and shown in the bio, which is
// where it belongs.
const ARTIST_PREFIX = ['Lil', 'Young', 'Big', 'King', 'Prince', 'MC', 'Yung', 'Kid', 'Slim', 'DJ',
                       'Lady', 'Queen', 'Sista', 'Brother', 'Mr', 'Sir', 'Ace', 'Chief', 'Papa', 'Mama',
                       'Don', 'Saint', 'Boss', 'General', 'Captain', 'Doctor'];
const ARTIST_TAG = ['Boi', 'Bwoy', 'Man', 'Boy', 'Gal', 'Gyal', 'God', 'Wave', 'World', 'City',
                    'Nation', 'Gang', 'Plug', 'Don', 'Boss', 'Star', 'Kid', 'Child', 'Son', 'Daughter',
                    'Music', 'Sounds', 'Vibes', 'Season', 'Energy'];
/** First halves of coined handles — `Ve` + `xo` = Vexo. */
const ARTIST_SYLL_A = ['Ve', 'Zo', 'Ky', 'Sa', 'Ne', 'Ro', 'Ta', 'Ju', 'Mi', 'Ko', 'Ba', 'De',
                       'Fi', 'Gu', 'Lo', 'Ma', 'Pa', 'Ry', 'Shi', 'To', 'Va', 'Wi', 'Ya', 'Zu',
                       'Chi', 'Dre', 'Kwe', 'Nka', 'Ose', 'Twi'];
/** Second halves. Deliberately shaped so the join reads like a name, not noise. */
const ARTIST_SYLL_B = ['xo', 'zo', 'ro', 'ko', 'do', 'go', 'lo', 'mo', 'no', 'po', 'so', 'to',
                       'vo', 'wo', 'yo', 'ka', 'la', 'na', 'ra', 'sa', 'ta', 'va', 'za', 'ma',
                       'no', 'sta', 'sha', 'kay', 'dez', 'ree'];
/** Optional closing consonant, so handles are not all vowel-final. */
const ARTIST_SYLL_C = ['', '', '', 'z', 'x', 'sh', 'th', 'k', 'n', 'r', 's'];


// Fictional labels only — no real companies in the world.
const LABEL_NAMES = ['Gold Coast Records', 'Night Shift Music', 'Crown Sound', 'Eastside Vinyl', 'Harbor Lights', 'Northstar Records',
                     'Red Clay Music', 'Blue Lagoon Records', 'Iron Lion', 'Paper Planes', 'Sunset Records', 'Highlife House', 'Kingmaker Music', 'Afterhours'];
export const FICTIONAL_LABELS = LABEL_NAMES;

const MEDIA_NAMES = ['The Beat', 'Hype Nation', 'Sound Check', 'The Wave', 'Front Row', 'Backstage',
                     'The Plug', 'Noise Report', 'Turntable', 'The Scoop'];

const ROLE_WEIGHTS: Array<{ role: NPCRole; weight: number }> = [
  { role: 'artist', weight: 42 },
  { role: 'producer', weight: 9 },
  { role: 'dj', weight: 6 },
  { role: 'manager', weight: 6 },
  { role: 'engineer', weight: 5 },
  { role: 'songwriter', weight: 5 },
  { role: 'media', weight: 4 },
  { role: 'blogger', weight: 4 },
  { role: 'publicist', weight: 3 },
  { role: 'photographer', weight: 3 },
  { role: 'session_musician', weight: 3 },
  { role: 'promoter', weight: 3 },
  { role: 'ar', weight: 2 },
  { role: 'a_and_r_scout', weight: 2 },
  { role: 'label_ceo', weight: 2 },
  { role: 'stylist', weight: 2 },
  { role: 'venue_owner', weight: 2 },
  { role: 'lawyer', weight: 2 },
  { role: 'radio_owner', weight: 2 },
  { role: 'rival_manager', weight: 2 },
  { role: 'distributor', weight: 2 },
  { role: 'tour_manager', weight: 2 },
  { role: 'choreographer', weight: 2 },
  { role: 'investor', weight: 1 },
];

// ─── DETERMINISTIC RNG ────────────────────────────────────────────────────
// mulberry32 — small, fast, and stable across runs, which matters because we
// regenerate the roster rather than persisting it.

function makeRng(seed: number) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMany<T>(rng: () => number, arr: T[], n: number): T[] {
  const out: T[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (out.length < n && guard++ < 200) {
    const i = Math.floor(rng() * arr.length);
    if (used.has(i)) continue;
    used.add(i);
    out.push(arr[i]);
  }
  return out;
}

function weightedRole(rng: () => number): NPCRole {
  const total = ROLE_WEIGHTS.reduce((s, r) => s + r.weight, 0);
  let roll = rng() * total;
  for (const r of ROLE_WEIGHTS) {
    roll -= r.weight;
    if (roll <= 0) return r.role;
  }
  return 'artist';
}

// ─── GENERATION ───────────────────────────────────────────────────────────

function namesFor(country: string) {
  const pool = FIRST_NAMES[country] ?? DEFAULT_NAMES;
  const surnames = SURNAMES[country] ?? DEFAULT_SURNAMES;
  return { pool, surnames };
}

/** Fame ceiling by tier — international acts are the household names. */
function fameFor(rng: () => number, tier: NPCTier): number {
  const r = rng();
  // Generated fame is deliberately capped BELOW the curated roster, which runs
  // 52-99 with its headliners at 93+.
  //
  // It used to reach 100, which meant anonymous NPCs out-famed Drake (97) and
  // Kendrick (96). Since chart points are weighted by artist fame, the global
  // chart filled up with people like "Duane Barnes" and "Nicole García" while
  // the names the player actually recognises sat underneath them. Measured on a
  // fresh world: the six highest-fame artists were all generated, every one of
  // them at fame 100.
  //
  // Capping at 92 was not enough on its own. There are a few hundred generated
  // "international" acts, so a 70-92 band put a crowd of them level with the
  // curated stars, and over six game months the Global Top 10 was almost all
  // invented names. The band now tops out at 80: a generated act can still
  // break the chart, but it has to do it on the record rather than on standing.
  if (tier === 'international') return Math.round(58 + r * 22); // 58-80
  if (tier === 'national') return Math.round(34 + r * 34); // 34-68
  return Math.round(2 + r * 29); // 2-31
}

/**
 * A stage name for a generated artist, plus the legal name it hides.
 *
 * Four shapes, weighted so the pool stays varied without producing anything
 * unpronounceable: a prefix plus the surname (Young Adjei), a coined handle
 * (Kwezo), a surname plus a tag (Adjei Boi), and a first name plus a tag.
 */
function artistAlias(
  rng: () => number,
  first: string,
  last: string,
): { alias: string; real: string } {
  const real = `${first} ${last}`;
  const roll = rng();

  if (roll < 0.3) {
    return { alias: `${pick(rng, ARTIST_PREFIX)} ${last}`, real };
  }
  if (roll < 0.6) {
    const coined =
      pick(rng, ARTIST_SYLL_A) + pick(rng, ARTIST_SYLL_B) + pick(rng, ARTIST_SYLL_C);
    // Capitalise, since the syllable pools are lowercase-tail.
    return { alias: coined.charAt(0).toUpperCase() + coined.slice(1), real };
  }
  if (roll < 0.8) {
    return { alias: `${last} ${pick(rng, ARTIST_TAG)}`, real };
  }
  return { alias: `${first} ${pick(rng, ARTIST_TAG)}`, real };
}


function tierFor(rng: () => number, sceneEnvelope: number): NPCTier {
  const r = rng();
  // Bigger scenes produce more genuinely famous people.
  const intlChance = 0.03 + (sceneEnvelope / 1000) * 0.06;
  const natlChance = 0.2 + (sceneEnvelope / 1000) * 0.15;
  if (r < intlChance) return 'international';
  if (r < intlChance + natlChance) return 'national';
  return 'local';
}

function bioFor(role: NPCRole, city: string, country: string, rng: () => number): string {
  const city_ = city || country;
  switch (role) {
    case 'artist':
      return `${pick(rng, ['Grinding out of', 'Holding it down in', 'Came up through', 'Running the underground in'])} ${city_}. ${pick(rng, [
        'Still hungry, still unsigned, still dangerous.',
        'Has a small but ferocious fanbase that will fight you online.',
        'One hit away from leaving the city behind.',
        'Refuses to change the sound for anybody.',
        'Been in the game ten years and finally getting looks.',
      ])}`;
    case 'producer':
      return `Producer and beatmaker working out of a home studio in ${city_}. ${pick(rng, [
        'Has placements on records you have heard.',
        'Charges too much and knows it.',
        'Will send you 40 beats and one of them is a hit.',
        'Runs the most in-demand drum kit in the city.',
      ])}`;
    case 'manager':
      return `Manager based in ${city_}. ${pick(rng, [
        'Reps three artists and is looking for a fourth.',
        'Known for getting small acts into big rooms.',
        'Talks a big game and mostly backs it up.',
        'Has burned bridges and rebuilt them twice.',
      ])}`;
    case 'rival_manager':
      return `Competitive manager in ${city_} who would happily sign your artist out from under you. ${pick(rng, [
        'Keeps a list of every act he almost signed.',
        'Has a reputation for moving ruthless.',
        'Plays the long game and plays it well.',
      ])}`;
    case 'label_ceo':
      return `Executive at ${pick(rng, LABEL_NAMES)} overseeing ${country} operations. ${pick(rng, [
        'Signs two acts a year and drops one.',
        'Believes in artist development, which is rare.',
        'Wants a global hit and does not care who makes it.',
      ])}`;
    case 'ar':
      return `A&R scout covering ${country}. ${pick(rng, [
        'Sits in the back of every showcase in the city.',
        'Has an ear for what will be big in 18 months.',
        'DMs artists before they blow up.',
      ])}`;
    case 'lawyer':
      return `Music attorney in ${city_}. ${pick(rng, [
        'Reads every clause, including the ones you skipped.',
        'Believes a bad deal is worse than no deal.',
        'Has never lost a publishing dispute.',
      ])}`;
    case 'media':
      return `Runs ${pick(rng, MEDIA_NAMES)}, covering the ${country} scene. ${pick(rng, [
        'Can make or break a release with one article.',
        'Refuses to publish hype without receipts.',
        'Posts first and apologises later.',
      ])}`;
    case 'publicist':
      return `Publicist in ${city_}. ${pick(rng, [
        'Specialises in crisis management.',
        'Can get you on a magazine cover in a week.',
        'Keeps her clients out of the tabloids, mostly.',
      ])}`;
    case 'radio_owner':
      return `Owns two radio stations across ${country}. ${pick(rng, [
        'Playlist rotation here still moves records.',
        'Only plays what tests well with callers.',
        'Can break a song nationally in three weeks.',
      ])}`;
    case 'engineer':
      return `Mix and master engineer in ${city_}. ${pick(rng, [
        'Makes a rough demo sound like a finished record.',
        'Booked out six weeks and worth the wait.',
        'Will tell you the truth about your vocal takes.',
        'Runs the cleanest signal chain in the city.',
      ])}`;
    case 'dj':
      return `DJ holding down ${city_}. ${pick(rng, [
        'Breaks records in the club months before radio.',
        'Has the only crowd that actually knows the words.',
        'Mixes on instinct and never misses.',
      ])}`;
    case 'blogger':
      return `Runs a ${country} music blog out of ${city_}. ${pick(rng, [
        'Posts first and edits later, but is usually right.',
        'Refuses to cover payola and it costs him.',
        'Has a comment section that decides careers.',
      ])}`;
    case 'promoter':
      return `Concert promoter in ${city_}. ${pick(rng, [
        'Can fill a 5,000-cap room with two weeks notice.',
        'Has been burned by an artist once and remembers.',
        'Fronts the money and takes the risk.',
      ])}`;
    case 'stylist':
      return `Stylist and image consultant in ${city_}. ${pick(rng, [
        'Built three of the biggest looks in the scene.',
        'Says the clothes are the marketing.',
        'Will not let a client leave the house badly dressed.',
      ])}`;
    case 'photographer':
      return `Photographer shooting the ${country} scene. ${pick(rng, [
        'Shot every important cover of the last five years.',
        'Works only in natural light and it shows.',
        'Has an archive of everybody before they made it.',
      ])}`;
    case 'songwriter':
      return `Top-line writer based in ${city_}. ${pick(rng, [
        'Writes hooks for artists who get the credit.',
        'Keeps a notebook of 400 unfinished ideas.',
        'Can turn a mood into a chorus in twenty minutes.',
      ])}`;
    case 'session_musician':
      return `Session player in ${city_}. ${pick(rng, [
        'Plays six instruments and is modest about all of them.',
        'Booked on half the records coming out this year.',
        'Will nail a take in one and go home.',
      ])}`;
    case 'distributor':
      return `Independent distributor covering ${country}. ${pick(rng, [
        'Gets records onto every platform without a label.',
        'Takes a flat cut and no rights, which is rare.',
        'Knows exactly which DSPs matter in each market.',
      ])}`;
    case 'investor':
      return `Quiet-money investor in ${city_} looking at music. ${pick(rng, [
        'Buys catalogues and never talks about it.',
        'Wants to own the master, always.',
        'Has funded three careers and lost money on two.',
      ])}`;
    case 'venue_owner':
      return `Owns a live venue in ${city_}. ${pick(rng, [
        'Every big act in the city played his stage first.',
        'Books on gut feel and is right more often than not.',
        'Keeps the door split fair, which is why artists come back.',
      ])}`;
    case 'a_and_r_scout':
      return `Scout for a major, covering ${country}. ${pick(rng, [
        'Sits in the back of every showcase with a notebook.',
        'Has an ear for what will be big in 18 months.',
        'Signs people before they know they are good.',
      ])}`;
    case 'choreographer':
      return `Choreographer working with ${country} artists. ${pick(rng, [
        'Turns a record into a routine people copy online.',
        'Ran a dance crew before any of the artists were famous.',
        'Says the body remembers what the mind forgets.',
      ])}`;
    case 'tour_manager':
      return `Tour manager running routes across ${country}. ${pick(rng, [
        'Has never lost a promoter money or an artist a night.',
        'Runs a tight bus and a tighter schedule.',
        'Knows every border crossing and how to move fast.',
      ])}`;
    default:
      return `Part of the ${city_} scene.`;
  }
}

/**
 * Generate the full roster for every country.
 *
 * Counts come from `sceneSize` in locations.ts. The roster is generated lazily
 * and cached — see `getNPCs()` — because a full 69-country scene is several
 * thousand records. The sim only ticks NPCs that have actual releases, so a
 * larger roster costs memory but not framerate.
 */
export function generateNPCs(opts?: { maxTotal?: number }): NPC[] {
  const maxTotal = opts?.maxTotal ?? Number.POSITIVE_INFINITY;
  const out: NPC[] = [];

  for (const country of LOCATIONS) {
    const rng = makeRng(hashString(country.name));
    const { pool, surnames } = namesFor(country.name);
    const cities = country.cities.map((c) => c.name);
    const target = country.sceneSize;
    const usedNames = new Set<string>();

    for (let i = 0; i < target && out.length < maxTotal; i++) {
      const role = weightedRole(rng);
      const gender: Gender = rng() < 0.5 ? 'male' : 'female';
      const firstPool = gender === 'male' ? pool.male : pool.female;

      const first = pick(rng, firstPool);
      const last = pick(rng, surnames);
      const legalName = `${first} ${last}`;

      // Artists work under a stage name, and so do most producers and DJs.
      const usesAlias = role === 'artist' || (role === 'producer' && rng() < 0.6);

      // Try hard for a unique display name; only fall back to a suffix once the
      // plain combinations within this country are exhausted.
      let name = '';
      for (let attempt = 0; attempt < 14; attempt++) {
        let candidate: string;
        if (role === 'artist') {
          candidate = artistAlias(rng, first, last).alias;
        } else if (usesAlias) {
          candidate = `${pick(rng, PRODUCER_PREFIX)} ${pick(rng, PRODUCER_SUFFIX)}`;
        } else {
          candidate = `${attempt === 0 ? first : pick(rng, firstPool)} ${attempt < 2 ? last : pick(rng, surnames)}`;
        }
        if (!usedNames.has(candidate)) {
          name = candidate;
          break;
        }
      }
      if (!name) {
        // Genuinely out of combinations — add a distinct handle.
        const handle = pick(rng, ['II', 'III', 'Jr', 'the Second', 'Younger', 'Official', 'HQ', 'Music']);
        name = `${pick(rng, firstPool)} ${pick(rng, surnames)} ${handle}`;
        if (usedNames.has(name)) continue;
      }
      usedNames.add(name);

      const tier = tierFor(rng, country.sceneSize);
      const city = pick(rng, cities);

      const npc: NPC = {
        id: `gen_${country.name.replace(/[^a-zA-Z]/g, '').toLowerCase()}_${i}`,
        name,
        // For anyone performing under an alias, the plain name is their legal
        // name and the profile shows it in the bio.
        realName: usesAlias ? legalName : undefined,
        tier,
        role,
        personality: pickMany(rng, PERSONALITY_TRAITS, 2 + Math.floor(rng() * 2)),
        genre: role === 'artist' || role === 'producer' ? pick(rng, GENRES) : undefined,
        country: country.name,
        city,
        relationshipScore: 0,
        relationshipStage: 'acquainted',
        memoryLog: [],
        fame: fameFor(rng, tier),
        isAvailable: true,
        gender,
        age: 19 + Math.floor(rng() * 24),
        bio: bioFor(role, city, country.name, rng),
      };

      out.push(npc);
    }
  }

  return out;
}

/** Countries ranked by scene size, for UI that wants to show the big rooms. */
export function sceneRanking(): Array<{ country: string; sceneSize: number; continent: string }> {
  return [...LOCATIONS]
    .map((c) => ({ country: c.name, sceneSize: c.sceneSize, continent: c.continent }))
    .sort((a, b) => b.sceneSize - a.sceneSize);
}

/** A made-up stage name (and legal name) for somebody from this country — the same seed always gives the same person. */
export function fictionalAlias(seed: string, country: string, gender: string): { alias: string; real: string } {
  const rng = makeRng(hashString(`alias|${seed}`));
  const { pool, surnames } = namesFor(country);
  const firsts = gender === 'female' ? pool.female : pool.male;
  return artistAlias(rng, pick(rng, firsts), pick(rng, surnames));
}

/** A made-up full name for a non-artist (a manager, an exec). */
export function fictionalPerson(seed: string, country: string): string {
  const rng = makeRng(hashString(`person|${seed}`));
  const { pool, surnames } = namesFor(country);
  return `${pick(rng, rng() < 0.5 ? pool.male : pool.female)} ${pick(rng, surnames)}`;
}
