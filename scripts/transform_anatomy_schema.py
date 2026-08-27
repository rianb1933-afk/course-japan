#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Transformasi data anatomi lama (SYSTEMS) ke skema baru sesuai Tahap 1 spesifikasi.
Setiap field baru (english, location, function, aliases, audioText) ditulis manual
per-istilah untuk akurasi -- BUKAN auto-generate/template generik, karena ini konten
edukasi anatomi yang harus benar."""
import json, re, unicodedata

raw = json.load(open('/tmp/systems_raw.json', encoding='utf-8'))

# Terjemahan Inggris + lokasi + fungsi singkat, ditulis per istilah untuk akurasi.
# Key = (system, japanese) supaya unik meski ada 心臓 muncul di 2 sistem berbeda dst.
ENRICH = {
 ('luar','頭'): {'english':'Head','location':'Bagian paling atas tubuh, di atas leher','function':'Menampung otak dan organ indera utama'},
 ('luar','首'): {'english':'Neck','location':'Menghubungkan kepala dengan badan','function':'Menopang kepala, jalur saraf & pembuluh darah ke otak'},
 ('luar','肩'): {'english':'Shoulder','location':'Sendi antara lengan atas dan badan','function':'Menghubungkan lengan ke tubuh, memungkinkan gerak lengan luas'},
 ('luar','胸'): {'english':'Chest','location':'Bagian depan badan atas, di atas perut','function':'Melindungi jantung dan paru-paru'},
 ('luar','背中'): {'english':'Back','location':'Bagian belakang badan, dari leher ke pinggang','function':'Menopang postur tubuh, melindungi tulang belakang'},
 ('luar','お腹'): {'english':'Stomach/Belly (external)','location':'Bagian depan badan bawah, di bawah dada','function':'Menampung organ pencernaan'},
 ('luar','腰'): {'english':'Lower back/Waist','location':'Antara perut dan panggul, punggung bawah','function':'Menopang berat tubuh bagian atas saat bergerak'},
 ('luar','腕'): {'english':'Arm','location':'Dari bahu ke pergelangan tangan','function':'Menjangkau dan memegang benda'},
 ('luar','肘'): {'english':'Elbow','location':'Sendi tengah lengan','function':'Menekuk & meluruskan lengan'},
 ('luar','手'): {'english':'Hand','location':'Ujung lengan','function':'Memegang, meraba, melakukan aktivitas motorik halus'},
 ('luar','指'): {'english':'Finger','location':'Ujung tangan/kaki','function':'Menggenggam, menunjuk, meraba tekstur'},
 ('luar','もも'): {'english':'Thigh','location':'Antara panggul dan lutut','function':'Menopang berat badan, menggerakkan kaki'},
 ('luar','膝'): {'english':'Knee','location':'Sendi tengah kaki','function':'Menekuk & meluruskan kaki saat berjalan/duduk'},
 ('luar','足'): {'english':'Leg/Foot','location':'Dari panggul ke ujung bawah tubuh','function':'Menopang berat badan & alat gerak utama'},
 ('luar','足首'): {'english':'Ankle','location':'Sendi antara betis dan telapak kaki','function':'Menekuk kaki, menjaga keseimbangan'},
 ('luar','手のひら'): {'english':'Palm','location':'Sisi dalam tangan','function':'Permukaan utama untuk menggenggam & menopang'},
 ('luar','甲'): {'english':'Back of hand/foot','location':'Sisi luar/atas tangan atau kaki','function':'Permukaan luar, umum lokasi infus'},
 ('luar','踵'): {'english':'Heel','location':'Bagian belakang telapak kaki','function':'Menopang berat badan saat berdiri/berjalan'},
 ('luar','わき'): {'english':'Armpit','location':'Bawah sendi bahu','function':'Lokasi umum pengukuran suhu tubuh'},
 ('luar','へそ'): {'english':'Navel/Belly button','location':'Tengah perut','function':'Bekas sambungan tali pusar, titik acuan lokasi perut'},

 ('indera','目'): {'english':'Eye','location':'Wajah bagian atas, di bawah alis','function':'Indera penglihatan'},
 ('indera','まぶた'): {'english':'Eyelid','location':'Menutupi bola mata','function':'Melindungi & melembapkan permukaan mata'},
 ('indera','角膜'): {'english':'Cornea','location':'Lapisan terluar bola mata','function':'Memfokuskan cahaya masuk ke mata'},
 ('indera','水晶体'): {'english':'Lens (of the eye)','location':'Di belakang pupil','function':'Memfokuskan cahaya ke retina'},
 ('indera','網膜'): {'english':'Retina','location':'Lapisan paling belakang bola mata','function':'Menangkap cahaya & mengubahnya jadi sinyal saraf'},
 ('indera','鼓膜'): {'english':'Eardrum','location':'Dalam saluran telinga','function':'Bergetar merespons suara, meneruskan ke telinga dalam'},
 ('indera','耳垢'): {'english':'Earwax','location':'Saluran telinga luar','function':'Melindungi telinga dari kotoran & infeksi'},
 ('indera','耳'): {'english':'Ear','location':'Sisi kanan-kiri kepala','function':'Indera pendengaran & keseimbangan'},
 ('indera','眉毛'): {'english':'Eyebrow','location':'Atas mata','function':'Melindungi mata dari keringat, ekspresi wajah'},
 ('indera','頬'): {'english':'Cheek','location':'Sisi wajah, di bawah mata','function':'Bagian wajah yang menunjukkan status gizi'},
 ('indera','額'): {'english':'Forehead','location':'Wajah bagian atas, di bawah rambut','function':'Area umum untuk cek suhu tubuh manual'},
 ('indera','あご'): {'english':'Chin','location':'Bawah mulut, ujung rahang','function':'Membantu posisi kepala saat menelan'},
 ('indera','唇'): {'english':'Lips','location':'Pembuka mulut','function':'Membantu bicara & menutup mulut saat makan'},
 ('indera','鼻'): {'english':'Nose','location':'Tengah wajah','function':'Indera penciuman & jalur masuk udara pernapasan'},
 ('indera','口'): {'english':'Mouth','location':'Bawah hidung','function':'Jalur masuk makanan & alat bicara'},
 ('indera','歯'): {'english':'Teeth','location':'Dalam mulut','function':'Mengunyah makanan'},
 ('indera','舌'): {'english':'Tongue','location':'Dalam mulut','function':'Indera perasa & membantu menelan/bicara'},
 ('indera','喉'): {'english':'Throat','location':'Belakang mulut, atas leher','function':'Jalur makanan & udara'},
 ('indera','唾液'): {'english':'Saliva','location':'Dihasilkan kelenjar di mulut','function':'Membasahi makanan, membantu pencernaan awal'},
 ('indera','涙'): {'english':'Tears','location':'Dihasilkan kelenjar dekat mata','function':'Membasahi & melindungi permukaan mata'},

 ('rangka','骨'): {'english':'Bone','location':'Kerangka tubuh','function':'Menopang tubuh & melindungi organ dalam'},
 ('rangka','頭蓋骨'): {'english':'Skull','location':'Membungkus otak','function':'Melindungi otak dari benturan'},
 ('rangka','背骨'): {'english':'Spine','location':'Sepanjang punggung','function':'Menopang tubuh & melindungi sumsum tulang belakang'},
 ('rangka','肋骨'): {'english':'Rib','location':'Membungkus dada','function':'Melindungi jantung & paru-paru'},
 ('rangka','骨盤'): {'english':'Pelvis','location':'Bawah tulang belakang','function':'Menopang berat tubuh atas, melindungi organ panggul'},
 ('rangka','大腿骨'): {'english':'Femur (thigh bone)','location':'Dalam paha','function':'Tulang terpanjang tubuh, penopang berjalan'},
 ('rangka','上腕骨'): {'english':'Humerus (upper arm bone)','location':'Dalam lengan atas','function':'Menopang gerakan lengan'},
 ('rangka','膝蓋骨'): {'english':'Patella (kneecap)','location':'Depan sendi lutut','function':'Melindungi sendi lutut'},
 ('rangka','鎖骨'): {'english':'Clavicle (collarbone)','location':'Antara leher dan bahu','function':'Menghubungkan lengan ke rangka tubuh'},
 ('rangka','肩甲骨'): {'english':'Scapula (shoulder blade)','location':'Punggung atas','function':'Titik tumpu gerak bahu & lengan'},
 ('rangka','関節'): {'english':'Joint','location':'Pertemuan dua tulang','function':'Memungkinkan gerakan tubuh'},
 ('rangka','股関節'): {'english':'Hip joint','location':'Antara panggul dan paha','function':'Memungkinkan gerakan kaki & menopang berat badan'},
 ('rangka','肩関節'): {'english':'Shoulder joint','location':'Antara lengan atas dan bahu','function':'Memungkinkan gerakan lengan paling luas di tubuh'},

 ('organ','脳'): {'english':'Brain','location':'Dalam tengkorak','function':'Pusat kendali seluruh tubuh & pikiran'},
 ('organ','大脳'): {'english':'Cerebrum','location':'Bagian terbesar otak','function':'Mengatur berpikir, ingatan, gerakan sadar'},
 ('organ','小脳'): {'english':'Cerebellum','location':'Bawah belakang otak besar','function':'Mengatur keseimbangan & koordinasi gerak'},
 ('organ','脳幹'): {'english':'Brainstem','location':'Batang penghubung otak & sumsum tulang belakang','function':'Mengontrol fungsi vital otomatis (napas, jantung)'},
 ('organ','前頭葉'): {'english':'Frontal lobe','location':'Bagian depan otak besar','function':'Mengatur kepribadian & penilaian'},
 ('organ','海馬'): {'english':'Hippocampus','location':'Dalam otak, dekat lobus temporal','function':'Membentuk ingatan baru'},
 ('organ','心臓'): {'english':'Heart','location':'Rongga dada, sedikit ke kiri','function':'Memompa darah ke seluruh tubuh'},
 ('organ','心房'): {'english':'Atrium','location':'Ruang atas jantung','function':'Menerima darah masuk ke jantung'},
 ('organ','心室'): {'english':'Ventricle','location':'Ruang bawah jantung','function':'Memompa darah keluar dari jantung'},
 ('organ','心臓弁'): {'english':'Heart valve','location':'Antara ruang-ruang jantung','function':'Mencegah darah mengalir balik'},
 ('organ','肺'): {'english':'Lung','location':'Rongga dada, kanan & kiri','function':'Pertukaran oksigen & karbon dioksida'},
 ('organ','肝臓'): {'english':'Liver','location':'Perut kanan atas','function':'Menyaring racun & metabolisme'},
 ('organ','胃'): {'english':'Stomach','location':'Perut kiri atas','function':'Mencerna makanan secara kimiawi'},
 ('organ','腸'): {'english':'Intestine','location':'Rongga perut bawah','function':'Mencerna & menyerap nutrisi'},
 ('organ','腎臓'): {'english':'Kidney','location':'Punggung bawah, kanan & kiri tulang belakang','function':'Menyaring darah, membentuk urin'},
 ('organ','膀胱'): {'english':'Bladder','location':'Panggul bawah','function':'Menampung urin sebelum dikeluarkan'},
 ('organ','食道'): {'english':'Esophagus','location':'Dari tenggorokan ke lambung','function':'Menyalurkan makanan ke lambung'},
 ('organ','咽頭'): {'english':'Pharynx','location':'Belakang mulut & hidung','function':'Persimpangan jalur makanan & udara'},
 ('organ','直腸'): {'english':'Rectum','location':'Ujung usus besar','function':'Menyimpan feses sebelum BAB'},
 ('organ','唾液腺'): {'english':'Salivary gland','location':'Sekitar mulut','function':'Menghasilkan air liur'},
 ('organ','気管'): {'english':'Trachea (windpipe)','location':'Leher, depan esofagus','function':'Menyalurkan udara ke paru-paru'},
 ('organ','気管支'): {'english':'Bronchus','location':'Cabang trakea menuju paru-paru','function':'Menyalurkan udara ke dalam paru-paru'},
 ('organ','尿道'): {'english':'Urethra','location':'Dari kandung kemih ke luar tubuh','function':'Menyalurkan urin keluar tubuh'},
 ('organ','小腸'): {'english':'Small intestine','location':'Antara lambung dan usus besar','function':'Menyerap sebagian besar nutrisi'},
 ('organ','大腸'): {'english':'Large intestine (colon)','location':'Setelah usus halus','function':'Menyerap air, membentuk feses'},
 ('organ','胆のう'): {'english':'Gallbladder','location':'Bawah hati','function':'Menyimpan cairan empedu'},
 ('organ','脾臓'): {'english':'Spleen','location':'Perut kiri atas, dekat lambung','function':'Menyaring darah lama, mendukung imunitas'},
 ('organ','前立腺'): {'english':'Prostate','location':'Bawah kandung kemih (pria)','function':'Menghasilkan cairan mani, mengelilingi uretra'},
 ('organ','肛門'): {'english':'Anus','location':'Ujung saluran pencernaan','function':'Jalur keluar feses'},
 ('organ','膵臓'): {'english':'Pancreas','location':'Belakang lambung','function':'Menghasilkan insulin & enzim pencernaan'},
 ('organ','甲状腺'): {'english':'Thyroid gland','location':'Depan leher','function':'Mengatur metabolisme tubuh'},

 ('sirkulasi','血液'): {'english':'Blood','location':'Mengalir di seluruh pembuluh darah','function':'Mengangkut oksigen, nutrisi, & sel imun'},
 ('sirkulasi','動脈'): {'english':'Artery','location':'Menyebar dari jantung ke seluruh tubuh','function':'Membawa darah kaya oksigen dari jantung'},
 ('sirkulasi','静脈'): {'english':'Vein','location':'Menyebar kembali ke jantung','function':'Membawa darah kembali ke jantung'},
 ('sirkulasi','リンパ'): {'english':'Lymph','location':'Sistem saluran terpisah di seluruh tubuh','function':'Mendukung sistem kekebalan tubuh'},
 ('sirkulasi','神経'): {'english':'Nerve','location':'Menyebar dari otak & sumsum tulang belakang','function':'Menghantarkan sinyal listrik tubuh'},
 ('sirkulasi','脊髄'): {'english':'Spinal cord','location':'Dalam rongga tulang belakang','function':'Jalur utama sinyal saraf otak-tubuh'},
 ('sirkulasi','自律神経'): {'english':'Autonomic nervous system','location':'Menyebar ke seluruh organ dalam','function':'Mengatur fungsi otomatis tubuh (tekanan darah, suhu, dsb)'},
 ('sirkulasi','赤血球'): {'english':'Red blood cell','location':'Dalam darah','function':'Mengangkut oksigen'},
 ('sirkulasi','白血球'): {'english':'White blood cell','location':'Dalam darah','function':'Melawan infeksi'},
 ('sirkulasi','血小板'): {'english':'Platelet','location':'Dalam darah','function':'Membantu pembekuan darah'},

 ('otot','筋肉'): {'english':'Muscle','location':'Menyebar di seluruh tubuh','function':'Menggerakkan tubuh'},
 ('otot','腹筋'): {'english':'Abdominal muscle','location':'Depan perut','function':'Menopang postur duduk & membantu mengejan'},
 ('otot','心筋'): {'english':'Cardiac muscle','location':'Dinding jantung','function':'Memompa jantung secara otomatis'},
 ('otot','括約筋'): {'english':'Sphincter muscle','location':'Sekitar lubang tubuh (anus, dsb)','function':'Mengontrol buka-tutup saluran tubuh'},
 ('otot','大腿四頭筋'): {'english':'Quadriceps','location':'Depan paha','function':'Meluruskan lutut, menopang berdiri'},
 ('otot','三角筋'): {'english':'Deltoid','location':'Membungkus sendi bahu','function':'Mengangkat & memutar lengan'},
 ('otot','僧帽筋'): {'english':'Trapezius','location':'Leher hingga punggung atas','function':'Menggerakkan bahu & menopang leher'},
 ('otot','腓腹筋'): {'english':'Calf muscle (gastrocnemius)','location':'Belakang betis','function':'Menggerakkan telapak kaki, membantu sirkulasi'},
 ('otot','横隔膜'): {'english':'Diaphragm','location':'Bawah paru-paru','function':'Otot utama pernapasan'},
 ('otot','皮膚'): {'english':'Skin','location':'Membungkus seluruh tubuh','function':'Melindungi tubuh, mengatur suhu'},
 ('otot','毛'): {'english':'Hair/Body hair','location':'Menyebar di kulit','function':'Perlindungan & indikator kesehatan'},
 ('otot','汗腺'): {'english':'Sweat gland','location':'Dalam kulit','function':'Mengeluarkan keringat untuk mendinginkan tubuh'},
 ('otot','爪'): {'english':'Nail','location':'Ujung jari tangan/kaki','function':'Melindungi ujung jari'},
 ('otot','血管'): {'english':'Blood vessel','location':'Menyebar di seluruh tubuh','function':'Saluran aliran darah'},

 ('gerakan','曲げる'): {'english':'To bend/flex','location':'Aksi pada sendi','function':'Gerakan dasar menekuk sendi'},
 ('gerakan','伸ばす'): {'english':'To straighten/extend','location':'Aksi pada sendi','function':'Gerakan dasar meluruskan sendi'},
 ('gerakan','回す'): {'english':'To rotate','location':'Aksi pada sendi','function':'Gerakan memutar sendi'},
 ('gerakan','上げる'): {'english':'To raise/lift','location':'Aksi pada anggota tubuh','function':'Mengangkat bagian tubuh ke atas'},
 ('gerakan','支える'): {'english':'To support','location':'Aksi bantuan tubuh','function':'Menopang berat/posisi tubuh'},

 ('byoumei','肺炎'): {'english':'Pneumonia','location':'Menyerang paru-paru','function':'Peradangan jaringan paru akibat infeksi'},
 ('byoumei','脳梗塞'): {'english':'Ischemic stroke','location':'Menyerang otak','function':'Sumbatan pembuluh darah otak'},
 ('byoumei','心筋梗塞'): {'english':'Heart attack (myocardial infarction)','location':'Menyerang otot jantung','function':'Sumbatan pembuluh darah jantung'},
 ('byoumei','糖尿病'): {'english':'Diabetes','location':'Terkait fungsi pankreas','function':'Gangguan pengaturan gula darah'},
 ('byoumei','高血圧'): {'english':'Hypertension','location':'Terkait pembuluh darah & jantung','function':'Tekanan darah di atas normal'},
 ('byoumei','骨粗鬆症'): {'english':'Osteoporosis','location':'Menyerang tulang','function':'Kepadatan tulang menurun, mudah patah'},
 ('byoumei','認知症'): {'english':'Dementia','location':'Menyerang otak','function':'Penurunan daya ingat & fungsi kognitif'},
 ('byoumei','前立腺肥大'): {'english':'Benign prostatic hyperplasia (BPH)','location':'Menyerang prostat','function':'Pembesaran prostat, ganggu buang air kecil'},
 ('byoumei','白内障'): {'english':'Cataract','location':'Menyerang lensa mata','function':'Lensa mata mengeruh, penglihatan kabur'},
 ('byoumei','尿路感染症'): {'english':'Urinary tract infection (UTI)','location':'Menyerang saluran kemih','function':'Infeksi pada uretra/kandung kemih'},
}

def slugify(romaji, jp):
    s = re.sub(r'[^a-zA-Z0-9]+', '-', romaji.lower()).strip('-')
    return s or jp

result = {}
for sys_key, sys_data in raw.items():
    terms_out = []
    for t in sys_data['terms']:
        key = (sys_key, t['jp'])
        enrich = ENRICH.get(key, {})
        term_id = slugify(t['romaji'], t['jp'])
        # Contoh kalimat: ekstrak dari note jika ada pola "XXX = " atau "「」" di awal note
        entry = {
            'id': term_id,
            'system': sys_key,
            'japanese': t['jp'],
            'furigana': t['furi'],
            'romaji': t['romaji'],
            'indonesian': t['id'],
            'english': enrich.get('english', ''),
            'location': enrich.get('location', ''),
            'function': enrich.get('function', ''),
            'kaigoNote': t['note'],
            'kaigoExample': '',  # diisi manual bertahap; note sudah mengandung konteks kalimat
            'imageHotspot': None,  # menunggu aset gambar nyata (lihat catatan di anatomy-viewer.js)
            'modelHotspot': None,  # menunggu aset model 3D (lihat Tahap 7)
            'aliases': [],
            'audioText': t['jp'],
            'bodyId': t.get('bodyId'),  # dipertahankan untuk kompatibilitas SVG viewer existing
        }
        terms_out.append(entry)
    result[sys_key] = {'label': sys_data['label'], 'terms': terms_out}

# Statistik verifikasi
total = sum(len(v['terms']) for v in result.values())
missing_english = sum(1 for v in result.values() for t in v['terms'] if not t['english'])
print(f"Total istilah ditransformasi: {total}")
print(f"Istilah TANPA english (perlu dicek): {missing_english}")

json.dump(result, open('/tmp/systems_new_schema.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print("✅ Tersimpan ke /tmp/systems_new_schema.json")
