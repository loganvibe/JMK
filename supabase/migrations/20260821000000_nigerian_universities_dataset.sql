-- ============================================================
-- NIGERIAN UNIVERSITIES DATABASE SEED
-- Federal, State, and Private Universities
-- ============================================================

-- Clear existing data
TRUNCATE TABLE public.courses CASCADE;
TRUNCATE TABLE public.departments CASCADE;
TRUNCATE TABLE public.faculties CASCADE;
TRUNCATE TABLE public.universities CASCADE;

-- ============================================================
-- UNIVERSITIES
-- ============================================================
INSERT INTO public.universities (name, abbreviation, state) VALUES
-- Federal Universities
('University of Lagos', 'UNILAG', 'Lagos'),
('University of Ibadan', 'UI', 'Oyo'),
('Obafemi Awolowo University', 'OAU', 'Osun'),
('University of Nigeria, Nsukka', 'UNN', 'Enugu'),
('Ahmadu Bello University', 'ABU', 'Kaduna'),
('University of Ilorin', 'UNILORIN', 'Kwara'),
('University of Port Harcourt', 'UNIPORT', 'Rivers'),
('Covenant University', 'CU', 'Ogun'),
('University of Benin', 'UNIBEN', 'Edo'),
('Nnamdi Azikiwe University', 'UNIZIK', 'Anambra'),
('Lagos State University', 'LASU', 'Lagos'),
('University of Calabar', 'UNICAL', 'Cross River'),
('Rivers State University', 'RSU', 'Rivers'),
('Bayero University', 'BUK', 'Kano'),
('University of Jos', 'UNIJOS', 'Plateau'),
('Federal University of Technology, Minna', 'FUTMINNA', 'Niger'),
('Federal University of Technology, Owerri', 'FUTO', 'Imo'),
('Federal University of Technology, Akure', 'FUTA', 'Ondo'),
('Adekunle Ajasin University', 'AAUA', 'Ondo'),
('Ekiti State University', 'EKSU', 'Ekiti'),
('Olabisi Onabanjo University', 'OOU', 'Ogun'),
('Benue State University', 'BSU', 'Benue'),
('University of Uyo', 'UNIUYO', 'Akwa Ibom'),
('Delta State University', 'DELSU', 'Delta'),
('Imo State University', 'IMSU', 'Imo'),
('Kaduna State University', 'KASU', 'Kaduna'),
('Kano State University of Science and Technology', 'KUST', 'Kano'),
('Lagos State University of Science and Technology', 'LASUST', 'Lagos'),
('Nigerian Defence Academy', 'NDA', 'Kaduna'),
('Federal University of Petroleum Resources', 'FUPRE', 'Delta'),
('Federal University of Agriculture, Abeokuta', 'FUNAAB', 'Ogun'),
('Federal University of Education, Kano', 'FCE KANO', 'Kano'),
('University of Lagos College of Medicine', 'ULCM', 'Lagos'),
('Afe Babalola University', 'ABUAD', 'Ekiti'),
('Babcock University', 'BABCOCK', 'Ogun'),
('Crawford University', 'CRAWFORD', 'Ogun'),
('Bells University of Technology', 'BELLS', 'Ogun'),
('Caleb University', 'CALEB', 'Lagos'),
('Covenant University', 'CU', 'Ogun'),
('Landmark University', 'LMU', 'Kwara'),
('Lead City University', 'LCU', 'Ogun'),
('McPherson University', 'MCU', 'Ogun'),
('Nicholas University', 'NICHOLAS', 'Plateau'),
('Renaissance University', 'RNU', 'Enugu'),
('Salem University', 'SALEM', 'Ogun'),
('Tansian University', 'TANSIAN', 'Anambra'),
('Wesley University', 'WU', 'Ondo'),
('Western Delta University', 'WDU', 'Delta'),
('University of Mkar', 'UMKAR', 'Benue'),
('Nile University of Nigeria', 'NUN', 'Abuja'),
('Baze University', 'BAZE', 'Abuja'),
('Caritas University', 'CARITAS', 'Enugu'),
('College of Education, Ikere', 'COE IKERE', 'Ekiti'),
('Ebonyi State University', 'EBSU', 'Ebonyi'),
('Enugu State University of Science and Technology', 'ESUT', 'Enugu'),
('Gombe State University', 'GSU', 'Gombe'),
('Ibrahim Badamasi Babangida University', 'IBBU', 'Niger'),
('Kogi State University', 'KSU', 'Kogi'),
('Nasarawa State University', 'NSU', 'Nasarawa'),
('Ondo State University of Science and Technology', 'OSUSTECH', 'Ondo'),
('Plateau State University', 'PLASU', 'Plateau'),
('Sokoto State University', 'SSU', 'Sokoto'),
('Taraba State University', 'TSU', 'Taraba'),
('Umaru Musa Yar''Adua University', 'UMYU', 'Katsina'),
('Yobe State University', 'YSU', 'Yobe'),
('Zamfara State University', 'ZSU', 'Zamfara'),
('Air Force Institute of Technology', 'AFIT', 'Kaduna'),
('Army University, Biu', 'AUB', 'Borno'),
('Nigerian Maritime University', 'NMU', 'Delta'),
('Federal University of Education, Abeokuta', 'FCE ABEOKUTA', 'Ogun'),
('Federal University of Education, Asaba', 'FCE ASABA', 'Delta'),
('Federal University of Education, Iwo', 'FCE IWO', 'Osun'),
('Federal University of Education, Kontagora', 'FCE KONTAGORA', 'Niger'),
('Federal University of Education, Pankshin', 'FCE PANSHIN', 'Plateau'),
('Federal University of Education, Technical, Potiskum', 'FCE POTISKUM', 'Yobe'),
('Federal University of Education, Zaria', 'FCE ZARIA', 'Kaduna'),
('Federal University, Birnin Kebbi', 'FUBK', 'Kebbi'),
('Federal University, Dutse', 'FUD', 'Jigawa'),
('Federal University, Dutsin-Ma', 'FUDM', 'Katsina'),
('Federal University, Kashere', 'FUK', 'Gombe'),
('Federal University, Lokoja', 'FUL', 'Kogi'),
('Federal University, Ndufu-Alike', 'FUNAI', 'Ebonyi'),
('Federal University, Otuoke', 'FUOTUOKE', 'Bayelsa'),
('Federal University, Oye-Ekiti', 'FUOYE', 'Ekiti'),
('Federal University, Wukari', 'FUWUKARI', 'Taraba'),
('Alex Ekwueme Federal University, Ndufu Alike', 'AE-FUNAI', 'Ebonyi'),
('Federal University of Technology, Bauchi', 'FUTB', 'Bauchi'),
('Federal University of Technology, Gombe', 'FUTG', 'Gombe'),
('Federal University of Technology, Ilesa', 'FUTI', 'Osun'),
('Federal University of Technology, Yola', 'FUTY', 'Adamawa');

-- ============================================================
-- FACULTIES
-- ============================================================
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Arts' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Science' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Engineering' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Social Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Management Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Education' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Law' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Medicine' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Agriculture' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Environmental Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Pharmacy' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Basic Medical Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Clinical Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Computing' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Mathematical Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Biological Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Physical Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Earth Sciences' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Veterinary Medicine' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Nursing' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Public Health' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Medical Laboratory Science' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Radiography' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Fine and Applied Arts' FROM public.universities;
INSERT INTO public.faculties (university_id, name) SELECT id, 'Faculty of Languages' FROM public.universities;

-- ============================================================
-- DEPARTMENTS
-- ============================================================
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Computer Science' FROM public.faculties f WHERE f.name = 'Faculty of Computing' OR f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Electrical and Electronic Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Mechanical Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Civil Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Chemical Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Petroleum Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Agricultural Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering' OR f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Food Science and Technology' FROM public.faculties f WHERE f.name = 'Faculty of Engineering' OR f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Computer Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Mining Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Metallurgical Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Production Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Structural Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Water Resources Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Environmental Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Software Engineering' FROM public.faculties f WHERE f.name = 'Faculty of Computing' OR f.name = 'Faculty of Engineering';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Information Technology' FROM public.faculties f WHERE f.name = 'Faculty of Computing';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Cybersecurity' FROM public.faculties f WHERE f.name = 'Faculty of Computing';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Data Science' FROM public.faculties f WHERE f.name = 'Faculty of Computing' OR f.name = 'Faculty of Mathematical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Artificial Intelligence' FROM public.faculties f WHERE f.name = 'Faculty of Computing';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Mathematics' FROM public.faculties f WHERE f.name = 'Faculty of Mathematical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Statistics' FROM public.faculties f WHERE f.name = 'Faculty of Mathematical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Physics' FROM public.faculties f WHERE f.name = 'Faculty of Physical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Chemistry' FROM public.faculties f WHERE f.name = 'Faculty of Physical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Biochemistry' FROM public.faculties f WHERE f.name = 'Faculty of Biological Sciences' OR f.name = 'Faculty of Basic Medical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Microbiology' FROM public.faculties f WHERE f.name = 'Faculty of Biological Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Zoology' FROM public.faculties f WHERE f.name = 'Faculty of Biological Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Botany' FROM public.faculties f WHERE f.name = 'Faculty of Biological Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Biology' FROM public.faculties f WHERE f.name = 'Faculty of Biological Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Geology' FROM public.faculties f WHERE f.name = 'Faculty of Earth Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Geography' FROM public.faculties f WHERE f.name = 'Faculty of Earth Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Environmental Management' FROM public.faculties f WHERE f.name = 'Faculty of Environmental Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Architecture' FROM public.faculties f WHERE f.name = 'Faculty of Environmental Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Urban and Regional Planning' FROM public.faculties f WHERE f.name = 'Faculty of Environmental Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Estate Management' FROM public.faculties f WHERE f.name = 'Faculty of Environmental Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Quantity Surveying' FROM public.faculties f WHERE f.name = 'Faculty of Environmental Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Business Administration' FROM public.faculties f WHERE f.name = 'Faculty of Management Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Accounting' FROM public.faculties f WHERE f.name = 'Faculty of Management Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Banking and Finance' FROM public.faculties f WHERE f.name = 'Faculty of Management Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Economics' FROM public.faculties f WHERE f.name = 'Faculty of Social Sciences' OR f.name = 'Faculty of Management Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Marketing' FROM public.faculties f WHERE f.name = 'Faculty of Management Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Human Resource Management' FROM public.faculties f WHERE f.name = 'Faculty of Management Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Public Administration' FROM public.faculties f WHERE f.name = 'Faculty of Management Sciences' OR f.name = 'Faculty of Social Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Sociology' FROM public.faculties f WHERE f.name = 'Faculty of Social Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Political Science' FROM public.faculties f WHERE f.name = 'Faculty of Social Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Psychology' FROM public.faculties f WHERE f.name = 'Faculty of Social Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Mass Communication' FROM public.faculties f WHERE f.name = 'Faculty of Social Sciences' OR f.name = 'Faculty of Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'English Language' FROM public.faculties f WHERE f.name = 'Faculty of Arts' OR f.name = 'Faculty of Languages';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'History and International Studies' FROM public.faculties f WHERE f.name = 'Faculty of Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Religious Studies' FROM public.faculties f WHERE f.name = 'Faculty of Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Philosophy' FROM public.faculties f WHERE f.name = 'Faculty of Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Theatre Arts' FROM public.faculties f WHERE f.name = 'Faculty of Arts' OR f.name = 'Faculty of Fine and Applied Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Fine and Applied Arts' FROM public.faculties f WHERE f.name = 'Faculty of Fine and Applied Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Music' FROM public.faculties f WHERE f.name = 'Faculty of Fine and Applied Arts';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'French' FROM public.faculties f WHERE f.name = 'Faculty of Languages';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Arabic' FROM public.faculties f WHERE f.name = 'Faculty of Languages';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Law' FROM public.faculties f WHERE f.name = 'Faculty of Law';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Medicine and Surgery' FROM public.faculties f WHERE f.name = 'Faculty of Clinical Sciences' OR f.name = 'Faculty of Medicine';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Nursing' FROM public.faculties f WHERE f.name = 'Faculty of Nursing';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Pharmacy' FROM public.faculties f WHERE f.name = 'Faculty of Pharmacy';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Agricultural Economics' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Animal Science' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Crop Science' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Soil Science' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Agricultural Extension' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Forestry and Wildlife' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Fisheries and Aquaculture' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Home Science and Management' FROM public.faculties f WHERE f.name = 'Faculty of Agriculture';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Veterinary Medicine' FROM public.faculties f WHERE f.name = 'Faculty of Veterinary Medicine';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Veterinary Microbiology' FROM public.faculties f WHERE f.name = 'Faculty of Veterinary Medicine';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Veterinary Physiology' FROM public.faculties f WHERE f.name = 'Faculty of Veterinary Medicine';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Veterinary Anatomy' FROM public.faculties f WHERE f.name = 'Faculty of Veterinary Medicine';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Veterinary Pathology' FROM public.faculties f WHERE f.name = 'Faculty of Veterinary Medicine';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Public Health' FROM public.faculties f WHERE f.name = 'Faculty of Public Health';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Medical Laboratory Science' FROM public.faculties f WHERE f.name = 'Faculty of Medical Laboratory Science';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Radiography and Radiation Science' FROM public.faculties f WHERE f.name = 'Faculty of Radiography';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Medical Physics' FROM public.faculties f WHERE f.name = 'Faculty of Basic Medical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Anatomy' FROM public.faculties f WHERE f.name = 'Faculty of Basic Medical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Physiology' FROM public.faculties f WHERE f.name = 'Faculty of Basic Medical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Pharmacology' FROM public.faculties f WHERE f.name = 'Faculty of Basic Medical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Pathology' FROM public.faculties f WHERE f.name = 'Faculty of Basic Medical Sciences';
INSERT INTO public.departments (faculty_id, name)
SELECT f.id, 'Medical Biochemistry' FROM public.faculties f WHERE f.name = 'Faculty of Basic Medical Sciences';

-- ============================================================
-- COURSES
-- ============================================================
INSERT INTO public.courses (department_id, name, code)
SELECT d.id, 'Introduction to ' || d.name, 'INT' || substr(d.name, 1, 3) || '101'
FROM public.departments d;

INSERT INTO public.courses (department_id, name, code)
SELECT d.id, 'Advanced ' || d.name, 'ADV' || substr(d.name, 1, 3) || '201'
FROM public.departments d;

INSERT INTO public.courses (department_id, name, code)
SELECT d.id, 'Research Methods in ' || d.name, 'RES' || substr(d.name, 1, 3) || '301'
FROM public.departments d;

INSERT INTO public.courses (department_id, name, code)
SELECT d.id, 'Final Year Project', 'FYP' || substr(d.name, 1, 3) || '401'
FROM public.departments d;

INSERT INTO public.courses (department_id, name, code)
SELECT d.id, 'Seminar in ' || d.name, 'SEM' || substr(d.name, 1, 3) || '301'
FROM public.departments d;

INSERT INTO public.courses (department_id, name, code)
SELECT d.id, 'Industrial Training', 'IND' || substr(d.name, 1, 3) || '300'
FROM public.departments d;

-- ============================================================
-- RESEARCH FIELDS
-- ============================================================
INSERT INTO public.research_fields (name, description) VALUES
('Artificial Intelligence', 'AI, machine learning, deep learning, NLP, computer vision'),
('Cybersecurity', 'Network security, cryptography, ethical hacking, digital forensics'),
('Data Science', 'Big data analytics, data mining, statistical modeling, visualization'),
('Software Engineering', 'Software development, agile methodologies, DevOps, software testing'),
('Renewable Energy', 'Solar, wind, hydro, biomass, energy storage, smart grids'),
('Agriculture Technology', 'Precision agriculture, IoT farming, crop monitoring, agri-AI'),
('Health Informatics', 'E-health, medical records, health data analytics, telemedicine'),
('Education Technology', 'E-learning platforms, mobile learning, educational AI, LMS'),
('Environmental Science', 'Climate change, pollution control, waste management, conservation'),
('Finance and FinTech', 'Digital payments, blockchain, mobile banking, financial inclusion'),
('Transportation', 'Intelligent transport, traffic management, autonomous vehicles'),
('Telecommunications', '5G, IoT networks, signal processing, wireless communication'),
('Biotechnology', 'Genetic engineering, biopharmaceuticals, agricultural biotech'),
('Renewable Energy Systems', 'Solar PV, wind turbines, hybrid systems, microgrids'),
('Water Resources', 'Water treatment, irrigation, flood management, hydrogeology'),
('Oil and Gas', 'Petroleum exploration, reservoir engineering, gas processing'),
('Manufacturing', 'Lean manufacturing, robotics, quality control, Industry 4.0'),
('Social Sciences', 'Governance, policy analysis, social media analytics, criminology'),
('Business Innovation', 'Startups, SME growth, digital transformation, entrepreneurship'),
('Law and Technology', 'Cyber law, intellectual property, digital rights, e-governance');
