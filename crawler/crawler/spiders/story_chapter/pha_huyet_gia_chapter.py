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

class TruyenTranhChapterSpider(scrapy.Spider):
    name = "pha_huyet_gia_chapter"
    allowed_domains = ["truyenqqgo.com"]
    start_urls = ["https://truyenqqgo.com/truyen-tranh/pha-huyet-gia-19941"]

    def parse(self, response):
        chapters = []
        for chap in response.css("div.works-chapter-item"):
            chap_name = chap.css("div.name-chap a::text").get()
            chap_url = response.urljoin(chap.css("div.name-chap a::attr(href)").get())
            chapters.append({
                "name": chap_name,
                "url": chap_url,
            })
        for chap in chapters:
            yield scrapy.Request(
                chap["url"],
                callback=self.parse_chapter,
                meta={
                    "chapter": chap
                }
            )

    def parse_chapter(self, response):
        chapter = response.meta["chapter"]
        image_urls = response.css("div.page-chapter img::attr(data-original)").getall()
        if not image_urls:
            image_urls = response.css("div.page-chapter img::attr(src)").getall()
        gcs_urls = []
        headers = {
            "Referer": "https://truyenqqgo.com/",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
        for idx, img_url in enumerate(image_urls):
            chapter_name_en = chapter['name'].replace('Chương', 'Chapter').replace(' ', '_')
            gcs_path = f"pha-huyet-gia/{chapter_name_en}/{idx+1}.jpg"
            storage_client = storage.Client.from_service_account_json(GCS_CREDENTIALS)
            bucket = storage_client.bucket(GCS_BUCKET)
            blob = bucket.blob(gcs_path)
            if blob.exists():
                gcs_urls.append(blob.public_url)
                continue
            img_data = requests.get(img_url, headers=headers).content
            local_path = f"tmp_{idx}.jpg"
            with open(local_path, "wb") as f:
                f.write(img_data)
            gcs_url = upload_to_gcs(local_path, gcs_path)
            gcs_urls.append(gcs_url)
            os.remove(local_path)
        yield {
            "chapter": chapter["name"],
            "images": gcs_urls
        }