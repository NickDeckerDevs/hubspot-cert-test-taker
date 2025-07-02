This is messy because I don't know how to markdown

Extension:
Load unpacked to the extenion folder


To scrape


Setup - need python 3 alias to python, and some other things, i'm not that great at python so I will revisit this later... the gist is you gotta load up virtual environment, load the modules, then you can scrape

I'll move this ai slop to JS eventually


python3 -m venv venv


source venv/bin/activate 

pip install requests beautifulsoup4 trafilatura

Implement new test

python main.py scrape "https://www.gcertificationcourse.com/hubspot-service-hub-software-certification/" --name "Service Hub Software" --exam-url "https://app.hubspot.com/academy/171726/tracks/9148739/exam"