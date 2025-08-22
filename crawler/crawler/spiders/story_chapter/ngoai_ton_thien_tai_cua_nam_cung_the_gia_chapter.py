import scrapy
from google.cloud import storage
import requests
from io import BytesIO

GCS_BUCKET = "truyenff-images"
GCS_CREDENTIALS = "crawler/truyenff-466701-6d617a31f7b4.json"

# Khởi tạo client 1 lần
storage_client = storage.Client.from_service_account_json(GCS_CREDENTIALS)
bucket = storage_client.bucket(GCS_BUCKET)

def upload_to_gcs_from_bytes(data, gcs_path):
    blob = bucket.blob(gcs_path)
    if blob.exists():
        return blob.public_url
    blob.upload_from_file(BytesIO(data), content_type='image/jpeg')
    return blob.public_url

class NgoaiTonThienTaiSpider(scrapy.Spider):
    name = "ngoai_ton_thien_tai_cua_nam_cung_the_gia_chapter"
    allowed_domains = ["truyenqqgo.com"]
    start_urls = [
        "https://truyenqqgo.com/truyen-tranh/ngoai-ton-thien-tai-cua-nam-cung-the-gia-16187"
    ]

    def parse(self, response):
        chapters = []
        for chap in response.css("div.works-chapter-item"):
            chap_name = chap.css("div.name-chap a::text").get()
            chap_url = response.urljoin(chap.css("div.name-chap a::attr(href)").get())
            chapters.append({"name": chap_name, "url": chap_url})

        # Đảo thứ tự để chap cũ -> mới
        chapters = chapters[::-1]

        # Chỉ lấy 4 chap đầu tiên 
        for chap in chapters[:4]:
            yield scrapy.Request(
                chap["url"],
                callback=self.parse_chapter,
                meta={"chapter": chap}
            )

    def parse_chapter(self, response):
        chapter = response.meta["chapter"]
        image_urls = response.css("div.page-chapter img::attr(data-original)").getall()
        if not image_urls:
            image_urls = response.css("div.page-chapter img::attr(src)").getall()

        headers = {
            "Referer": "https://truyenqqgo.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }

        gcs_urls = []
        for idx, img_url in enumerate(image_urls):
            # Chuẩn hóa tên file
            chapter_name_en = chapter['name'].replace('Chương', 'Chapter').replace(' ', '_')
            gcs_path = f"ngoai-ton-thien-tai-cua-nam-cung-the-gia/{chapter_name_en}/{idx+1}.jpg"

            blob = bucket.blob(gcs_path)
            if blob.exists():
                gcs_urls.append(blob.public_url)
                continue

            # Tải ảnh trực tiếp từ URL
            img_data = requests.get(img_url, headers=headers).content
            gcs_url = upload_to_gcs_from_bytes(img_data, gcs_path)
            gcs_urls.append(gcs_url)

        yield {
            "chapter": chapter["name"],
            "images": gcs_urls
        }
