const scrapeIt = require("scrape-it")
const slugify = require('slugify')
const exec = require('child_process').exec
var express = require('express');
var wkhtmltopdf = require('wkhtmltopdf');
const nodemailer = require('nodemailer');
var path = require("path");

var fs = require('fs'),
    request = require('request');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.json());


require('dotenv').config()


let transporter = nodemailer.createTransport({
    host: 'mail.gmx.com',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

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

var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};



app.get('/', function (req, res) {
    console.log(`Called from web`);
    instapaper_to_pdf();
    res.send('Complete')
});

app.post('/send', function (req, res) {

    console.log(`Called send from web`);
    var uri = req.body.url;
    var url = require("url");
    var parsed = url.parse(uri);
    var name = path.basename(parsed.pathname);
    var filepath = `./pdfs/${name}`;
    download(uri, filepath, function(){
        os.execCommand(`./rmapi put ${filepath}`, function (returnvalue) {
            console.log(`${filepath} uploaded to rM`)
        });
    });

    res.send('Complete');
});



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
            file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
            filename = `${file}.pdf`;
            filepath = `./pdfs/${filename}`;

            os.execCommand(`./rmapi find . ${file}`, function (returnvalue) {
                if(!`${returnvalue}`.includes('/'))
                {
                    file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                    filename = `${file}.pdf`;
                    filepath = `./pdfs/${filename}`;
                    console.log(`${file} isn't on rM device`);
                    var stream = wkhtmltopdf(`https://www.instapaper.com${article.url}`, { output: `${filepath}`, cookie: [
                                        [`pfp`, `${process.env.INSTAPAPER_PFP}`], [`pfu`, `${process.env.INSTAPAPER_PFU}`], [`pfh`, `${process.env.INSTAPAPER_PFH}`]
                                    ],
                                    javascriptDelay: 2000
                                }).on('close', function (response){
                                    filename = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
                                    filepath = `./pdfs/${filename}`;
                                    console.log(`stored ${filename}`);

                                    os.execCommand(`./rmapi put ${filepath}`, function (returnvalue) {
                                        filename = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
                                        console.log(`${filename} uploaded to rM`)
                                        //EMAIL TO KINDLE
                                        const message = {
                                            from: 'brian.e.k@gmx.com',
                                            to: 'b1985e.k@kindle.com',
                                            subject: 'convert rM_send',
                                            attachments: [
                                                { path: filepath }
                                                ],
                                            text: 'See attachment'
                                        };
                                        transporter.sendMail(message, (error, info) => {
                                            if (error) {
                                                console.log(error);
                                                res.status(400).send({success: false})
                                            } else {
                                                console.log('sent email')
                                                res.status(200).send({success: true});
                                            }
                                        });

                                    });
                    })

                }
            });

        })
    });
}

var server = app.listen(app.get('port'), function() {
    console.log('Listening on port %d', server.address().port);
});