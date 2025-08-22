import scrapy


class TruyenChuSpider(scrapy.Spider):
    name = "dai_phung_da_canh_nhan_chuong_22"
    allowed_domains = ["truyenchu.net"]
    start_urls = [
        "https://truyenchu.net/truyen/dai-phung-da-canh-nhan/chuong-22/"
    ]

    def parse(self, response):
        # Lấy tiêu đề chương
        full_title = response.css("h1#chapter-heading::text").get(default="").strip()

        # Tách tên truyện và số chương
        if " - " in full_title:
            novel_title, chapter_number = full_title.split(" - ", 1)
        else:
            novel_title = "Không rõ"
            chapter_number = full_title

        # Lấy nội dung chương
        paragraphs = response.css("div.reading-content div.text-left p::text").getall()
        content = "\n".join(p.strip() for p in paragraphs if p.strip())

        yield {
            "novel_title": novel_title,
            "chapter_number": chapter_number,
            "content": content
        }
