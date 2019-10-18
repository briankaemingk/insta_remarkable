const scrapeIt = require("scrape-it")
const request = require('request')
const fs = require('fs')
const slugify = require('slugify')
const exec = require('child_process').exec
var express = require('express');
var wkhtmltopdf = require('wkhtmltopdf');

require('dotenv').config()

var port = process.env.PORT || 3000;
var app = express();
function os_func() {
    this.execCommand = function(cmd, callback) {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                return;
            }

            callback(stdout);
        });
    }
}
var os = new os_func();

app.get('/', function (req, res) {
    console.log(`Called from web`);
    instapaper_to_pdf();
    res.send('Complete')
});
app.listen(port, function () {
    console.log(`App listening`);
});


var token = process.env.PDF_COOL_TOKEN

var instapaperCookies = [
    {
        name: 'pfp',
        value: process.env.INSTAPAPER_PFP,
        domain: 'www.instapaper.com'
    },
    {
        name: 'pfu',
        value: process.env.INSTAPAPER_PFU,
        domain: 'www.instapaper.com'
    },
    {
        name: 'pfh',
        value: process.env.INSTAPAPER_PFH,
        domain: 'www.instapaper.com'
    }
]

// Promise interface
function instapaper_to_pdf() {
    scrapeIt({
        url: "https://www.instapaper.com/u"
        ,
        headers: {Cookie: `pfp=${process.env.INSTAPAPER_PFP}; pfu=${process.env.INSTAPAPER_PFU}; pfh=${process.env.INSTAPAPER_PFH}`}
    }, {
        articles: {
            listItem: ".article_inner_item",
            data: {
                title: "a.article_title",
                url: {
                    selector: "a.article_title",
                    attr: "href"
                }
            }
        }
    }).then(page => {
        console.log(page.articles);

        page.articles.forEach(function (article) {
            console.log(`https://www.instapaper.com${article.url}`);
            const slugRemove = /[$*_+~.,/()'"!\-:@]/g;
            filename = `./pdfs/${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
            if (!fs.existsSync(filename)) {

                var stream = wkhtmltopdf(`https://www.instapaper.com${article.url}`, { output: `${filename}`, cookie: [
                            [`pfp`, `${process.env.INSTAPAPER_PFP}`], [`pfu`, `${process.env.INSTAPAPER_PFU}`], [`pfh`, `${process.env.INSTAPAPER_PFH}`]
                        ],
                    javascriptDelay: 1000
                }).on('close', function (response){
                    filename = `./pdfs/${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
                    console.log(`stored ${filename}`);
                    os.execCommand(`./rmapi put ${filename} /Instapaper`, function (returnvalue) {
                        console.log(`uploaded to /Instapaper`)
                    });
                });
                    
            } else {
                console.log(`exists: ${filename}`)
            }
        })
    });
}