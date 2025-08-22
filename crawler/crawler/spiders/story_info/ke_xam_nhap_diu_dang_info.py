import scrapy
import requests
import os
from google.cloud import storage

GCS_BUCKET = "truyenff-images"
GCS_CREDENTIALS = "crawler/truyenff-466701-6d617a31f7b4.json"

def upload_to_gcs(local_path, gcs_path):
    storage_client = storage.Client.from_service_account_json(GCS_CREDENTIALS)
    bucket = storage_client.bucket(GCS_BUCKET)
    blob = bucket.blob(gcs_path)
    if blob.exists():
        return blob.public_url
    blob.upload_from_filename(local_path)
    return blob.public_url

class KeXamNhapDiuDangInfoSpider(scrapy.Spider):
    name = "ke_xam_nhap_diu_dang_info"
    allowed_domains = ["truyenqqgo.com"]
    start_urls = ["https://truyenqqgo.com/truyen-tranh/ke-xam-nhap-diu-dang-18867"]

    def parse(self, response):
        title = response.css("h1[itemprop='name']::text").get()
        authors = response.css("li.author p.col-xs-9 a::text").getall()
        status = response.css("li.status p.col-xs-9::text").get()
        genres = response.css("ul.list01 li.li03 a::text").getall()
        description = response.css("div.story-detail-info div.content::text").get()
        chapter_count = len(response.css("div.works-chapter-item"))
        cover_url = response.css("div.book_avatar img::attr(src)").get()

        gcs_cover_url = None
        if cover_url:
            cover_name = cover_url.split("/")[-1].split("?")[0]
            local_path = f"tmp_{cover_name}"
            headers = {
                "Referer": "https://truyenqqgo.com/",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
            img_data = requests.get(cover_url, headers=headers).content
            with open(local_path, "wb") as f:
                f.write(img_data)
            gcs_cover_url = upload_to_gcs(local_path, f"covers/{cover_name}")
            os.remove(local_path)

        yield {
            "story_title": title,
            "authors": authors,
            "status": status,
            "genres": genres,
            "description": description,
            "chapter_count": chapter_count,
            "cover": gcs_cover_url,
            "type": "story_info"
        }