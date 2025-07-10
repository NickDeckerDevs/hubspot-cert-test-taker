Todo: add context menus
https://m2kdevelopments.medium.com/11-understanding-chrome-extensions-context-menus-8643b96e4a8e

Todo: Fix the current popup stuff as it is just terrible. Maybe look at some other extensions out there

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


python main.py scrape "https://www.gcertificationcourse.com/hubspot-inbound-marketing-optimization-answers/" --name "Inbound Marketing Optimization" --exam-url "https://app.hubspot.com/academy/171726/tracks/9147492/exam"


python main.py scrape "[URL]" --name "[pagename]" --exam-url ""


to rescrape all items in the registry due to new updates or invalid stuff you can

python main.py rescrape-all --confirm

07/09/2025 -- feature branch
# Default behavior - accumulative updates
python main.py scrape "url" --name "Course Name" --exam-url "exam_url"
# Explicit overwrite when needed
python main.py scrape "url" --overwrite --name "Course Name" --exam-url "exam_url"
# Rescrape all with accumulative updates
python main.py rescrape-all --confirm
# Rescrape all with complete overwrite
python main.py rescrape-all --overwrite --confirm
























