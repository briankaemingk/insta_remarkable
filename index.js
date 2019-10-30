const scrapeIt = require("scrape-it")
const slugify = require('slugify')
const exec = require('child_process').exec
var express = require('express');
var wkhtmltopdf = require('wkhtmltopdf');
const nodemailer = require('nodemailer');


require('dotenv').config()


let transporter = nodemailer.createTransport({
    host: 'mail.gmx.com',
    port: 587,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

var port = process.env.PORT || 3000;
var app = express();


function os_func() {
    this.execCommand = function(cmd, callback) {
        exec(cmd, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error: ${error}`);
                if (`${error}`.includes('entry already exists')){
                    console.log("*****EXISTS")
                }
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

app.get('/send', function (req, res) {
    console.log(`Called send from web`);
    console.log(req);
    res.send('Complete')
});

app.listen(port, function () {
    console.log(`App listening`);
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



            // // Create the parameters for calling listObjects
            // var bucketParams = {
            //     Bucket: process.env.S3_BUCKET_NAME, Key: filename
            // };
            //
            // s3.headObject(bucketParams, function (err, metadata) {
            //     if (err && err.code === 'NotFound') {
            //         filename = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
            //         filepath = `./pdfs/${filename}`;
            //         var stream = wkhtmltopdf(`https://www.instapaper.com${article.url}`, { output: `${filepath}`, cookie: [
            //                 [`pfp`, `${process.env.INSTAPAPER_PFP}`], [`pfu`, `${process.env.INSTAPAPER_PFU}`], [`pfh`, `${process.env.INSTAPAPER_PFH}`]
            //             ],
            //             javascriptDelay: 2000
            //         }).on('close', function (response){
            //             filename = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
            //             filepath = `./pdfs/${filename}`;
            //             console.log(`stored ${filename}`);
            //
            //             os.execCommand(`./rmapi put ${filepath}`, function (returnvalue) {
            //                 console.log(`uploaded to rM`)
            //             });
            //
            //             //STORE IN S3
            //             var fileStream = fs.createReadStream(filepath);
            //             fileStream.on('error', function(err) {
            //                 console.log('File Error', err);
            //             });
            //             var uploadParams = {Bucket: process.env.S3_BUCKET_NAME, Key: filename, Body: fileStream};
            //
            //             // call S3 to retrieve upload file to specified bucket
            //             s3.upload (uploadParams, function (err, data) {
            //                 if (err) {
            //                     console.log("Error", err);
            //                 } if (data) {
            //                     console.log("Upload Success", data.Location);
            //
            //                     // filename = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
            //                     // filepath = `./pdfs/${filename}`;
            //
            //                         //EMAIL TO KINDLE
            //                     const message = {
            //                         from: 'brian.e.k@gmx.com',
            //                         to: 'b1985e.k@kindle.com',
            //                         subject: 'convert rM_send',
            //                         attachments: [
            //                             {
            //                                 path: filepath
            //
            //                 }
            //                         ],
            //                         text: 'See attachment'
            //                     };
            //
            //                     transporter.sendMail(message, (error, info) => {
            //                         if (error) {
            //                             console.log(error);
            //                             res.status(400).send({success: false})
            //                         } else {
            //                             console.log('sent email')
            //                             res.status(200).send({success: true});
            //                         }
            //                     });
            //                 }
            //             });
            //         });
            //
            //     } else {
            //         filename = `${slugify(article.title, {replacement: '-', remove: slugRemove, lower: true})}.pdf`;
            //         console.log(`exists: ${filename}`)
            //     }
            // });

        })
    });
}