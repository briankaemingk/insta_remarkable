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

const slugRemove = /[$*_+~.,/()'"!\-:@]/g;

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

app.post('/archive', function (req, res) {
    console.log(`Called archive from web`);
    var title = req.body.title;
    file = `${slugify(title, {replacement: '-', remove: slugRemove, lower: true})}`;
    os.execCommand(`./rmapi find . ${file}`, function (returnvalue) {
        if(returnvalue.includes(file)){
            file = `${slugify(title, {replacement: '-', remove: slugRemove, lower: true})}`;
            os.execCommand(`./rmapi rm ${file}`, function (returnvalue) {
                console.log(`Removing ${file} from rm`);
                res.status(200).send({success: true});
            });
        }
    });
});


app.post('/send', function (req, res) {
    console.log(`Called send from web`);
    var uri = req.body.url;
    var subject = req.body.subject;
    var url = require("url");
    var parsed = url.parse(uri);
    var name = path.basename(parsed.pathname);
    var filepath = `./pdfs/${name}`;
    download(uri, filepath, function(){
        os.execCommand(`./rmapi put ${filepath}`, function (returnvalue) {
            console.log(`${filepath} uploaded to rM`);

            // var pdfWriter = require('../hummus').createWriter(__dirname + '/output/AppendPagesTest.pdf');
            //
            // pdfWriter.appendPDFPagesFromPDF(__dirname + '/TestMaterials/Original.pdf');
            // pdfWriter.appendPDFPagesFromPDF(__dirname + '/TestMaterials/XObjectContent.PDF');
            // pdfWriter.appendPDFPagesFromPDF(__dirname + '/TestMaterials/BasicTIFFImagesTest.PDF');
            //
            // pdfWriter.end();

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
            if (subject.toLowerCase().indexOf("rm") == -1) {
                transporter.sendMail(message, (error, info) => {
                    if (error) {
                        console.log(error);
                        res.status(400).send({success: false})
                    } else {
                        console.log('sent email')
                        res.status(200).send({success: true});
                    }
                });
            }
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


var WSJCookies = [
    {
        name: 'gckp',
        value: 'cx:1vji9186e1cam2pm5i2e3z0xkv:1iz1f0ygho2hw',
        domain: '.cxense.com'
    },
    {
        name: '_scid',
        value: 'd88e10d1-13d4-42ce-9a6c-1e38a975b3ec',
        domain: '.wsj.com'
    },
    {
        name: 'djcs_auto',
        value: 'M1571864624%2FBqVzsu9H8O%2FjurqXzvxyq1oy%2BcS7TiaoPkwwSMQPHSxaZFcFuKC36H9KHyEErKu0gO7yq8WQw3xoJBiTP5DadVnjbkRX0WNqqbxBVvSEMu7rNYGGLpS5NKI%2BHTJE9Ca7VI7Ip8gam3wPbaqBJY76sCwpmjRJgzDQWNbnT21BzBFg2OumrV15KjtzqdQz6M2YySVdzrPn0S5PiGcMAUTzL0tlUPzV4OUwXWaWtpIdBPZvwtK%2Fc%2BE%2BxckXajsuoXgDrwpMLgQPYT5IqXrTF2YKkezJ%2F0kjcWjuaNta1X9AnztljC4LqNQCj%2BI1cPgJOyJx8KErQmg%2BGKlHlATsd1Npsg%3D%3DG',
        domain: '.wsj.com'
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
                // ,
                // source_url: "a.js_bookmark_edit action_link bookmark_edit_link muted open_modal android_hide",
                // s_url: {
                //     selector: "a.js_bookmark_edit action_link bookmark_edit_link muted open_modal android_hide",
                //     attr: "href"
                // }
            }
        }
    }).then(page => {
        console.log(page.articles);

        page.articles.forEach(function (article) {
            console.log(`https://www.instapaper.com${article.url}`);
            file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
            filename = `${file}.pdf`;
            filepath = `./pdfs/${filename}`;

            os.execCommand(`./rmapi find .`, function (returnvalue) {
                file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                filename = `${file}.pdf`;
                filepath = `./pdfs/${filename}`;
                if(!returnvalue.includes(file))
                {
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
                                        filepath = `./pdfs/${filename}`;
                                        console.log(`${filename} uploaded to rM`);
                                        //EMAIL TO KINDLE

                                        var stream = wkhtmltopdf(`https://www.instapaper.com${article.url}`, { minimumFontSize:30, "disable-smart-shrinking":true, "margin-top":0,"margin-bottom":0, "margin-left":0, "margin-right":0, pageSize: 'A4', output: `${filepath}`, cookie: [
                                                [`pfp`, `${process.env.INSTAPAPER_PFP}`], [`pfu`, `${process.env.INSTAPAPER_PFU}`], [`pfh`, `${process.env.INSTAPAPER_PFH}`]
                                            ],
                                            javascriptDelay: 2000
                                        }).on('close', function (response) {
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
                                                    console.log('emailed to kindle')
                                                    res.status(200).send({success: true});
                                                }
                                            });
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