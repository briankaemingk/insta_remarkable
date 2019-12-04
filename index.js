const scrapeIt = require("scrape-it")
const slugify = require('slugify')
const exec = require('child_process').exec;
var express = require('express');
var wkhtmltopdf = require('wkhtmltopdf');
const nodemailer = require('nodemailer');
var path = require("path");
var fs = require('fs');
var request = require('request');
var app = express();
app.set('port', process.env.PORT || 3000);
app.use(express.json());
var https = require('https');
var url = require('url');


require('dotenv').config();

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


fs.writeFile(".rmapi", "devicetoken: " + process.env.devicetoken + "\n" +
    "usertoken: " + process.env.usertoken, function(err) {

    if(err) {
        return console.log(err);
    }

    console.log("Saved config file");
});

os.execCommand(`wget  --delete-after --cookies=on --keep-session-cookies --save-cookies cookies.txt --post-data 'username=${process.env.insta_username}&password=${process.env.insta_password}' https://www.instapaper.com/user/login`, function (returnvalue) {
    console.log("Saved cookies file");
});

os.execCommand(`calibre-customize -a EpubSplit.zip`, function (returnvalue) {
    console.log("Added epubsplit");
});



const slugRemove = /[$*_+~.,/()'"!\-:@]/g;

let transporter = nodemailer.createTransport({
    host: 'mail.gmx.com',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};


app.get('/', function (req, res) {
    console.log(`Called from web`);
    var source_url = req.body.rr4gurl;
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
        //console.log(page.articles);

        page.articles.forEach(function (article) {
            article_id = article.url.split('/').pop();
            file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
            filename = `${file}.pdf`;
            filepath = `./pdfs/${filename}`;

            os.execCommand(`./rmapi find .`, function (returnvalue) {
                article_id = article.url.split('/').pop();
                file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                filename = `${file}.pdf`;
                filepath = `./pdfs/${filename}`;

                if(!returnvalue.includes(file)) {
                    console.log(`${file} isn't on rM device`);
                    os.execCommand(`ebook-convert instapaper-single.recipe ./pdfs/${file}_all.epub --username ${process.env.insta_username} --password ${process.env.insta_password}`, function (returnvalue) {
                        file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                        filename = `${file}.pdf`;
                        filepath = `./pdfs/${filename}`;
                        console.log('Created master epub file');
                        os.execCommand(`calibre-debug --run-plugin EpubSplit -- -o ./pdfs/${file}.epub ./pdfs/${file}_all.epub 3`, function (returnvalue) {
                            file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                            filename = `${file}.pdf`;
                            filepath = `./pdfs/${filename}`;
                            console.log('Created split epub file');
                            console.log(`ebook-convert ./pdfs/${file}.epub ${filepath} --output-profile tablet`);

                            os.execCommand(`ebook-convert ./pdfs/${file}.epub ${filepath}`, function (returnvalue) {
                                console.log(returnvalue);
                                filepath = `./pdfs/${filename}`;
                                console.log(`${filepath} uploaded to rM`);
                                console.log("Complete")
                            });


                            // os.execCommand(`ebook-convert ./pdfs/${file}.epub ${filepath} --output-profile tablet --sr1-search '<div class="calibre_navbar">(.|\n)*?</div>'`, function (returnvalue) {
                            //     file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                            //     filename = `${file}.pdf`;
                            //     filepath = `./pdfs/${filename}`;
                            //     console.log(returnvalue);
                            //     console.log('${filepath} - Created split pdf file');
                            //     console.log(`./rmapi put ${filepath}`);

                                // os.execCommand(`./rmapi put ${filepath}`, function (returnvalue) {
                                //     console.log(returnvalue);
                                //     filepath = `./pdfs/${filename}`;
                                //     console.log(`${filepath} uploaded to rM`);
                                //     console.log("Complete")
                                // });
                            //});
                        });
                    });



                    // os.execCommand(`wget  --delete-after --cookies=on --keep-session-cookies --save-cookies cookies.txt --post-data 'username=${process.env.insta_username}&password=${process.env.insta_password}' https://www.instapaper.com/user/login`, function (returnvalue) {
                    //     file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                    //     filename = `${file}.pdf`;
                    //     filepath = `./pdfs/${filename}`;
                    //     os.execCommand(`wget -O ./pdfs/instapaper.epub --cookies=on --load-cookies=cookies.txt http://www.instapaper.com/epub`, function (returnvalue) {
                    //         file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                    //         filename = `${file}.pdf`;
                    //         filepath = `./pdfs/${filename}`;
                    //         os.execCommand(`calibre-debug -x ./pdfs/instapaper.epub ./pdfs`, function (returnvalue) {
                    //             file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                    //             filename = `${file}.pdf`;
                    //             filepath = `./pdfs/${filename}`;
                    //             os.execCommand(`ebook-convert ./pdfs/story0.html ./pdfs/${filename} -vv`, function (returnvalue) {
                    //                 file = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}`;
                    //                 filename = `${file}.pdf`;
                    //                 filepath = `./pdfs/${filename}`;
                    //                 console.log(returnvalue)
                    //             });
                    //         });
                    //     });
                    // });


                }
            });

        })
    });
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
        else{
            console.log(`File ${file} not found on rm`);
            res.status(200).send({success: true});
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
];


var server = app.listen(app.get('port'), function() {
    console.log('Listening on port %d', server.address().port);
});