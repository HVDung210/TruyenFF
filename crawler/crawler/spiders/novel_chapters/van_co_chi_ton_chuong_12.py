import scrapy


class TruyenChuSpider(scrapy.Spider):
    name = "van_co_chi_ton_chuong_12"
    allowed_domains = ["truyenchu.net"]
    start_urls = [
        "https://truyenchu.net/truyen/van-co-chi-ton/chuong-12/"
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
