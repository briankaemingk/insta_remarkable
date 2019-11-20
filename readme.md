# howto

1. copy `.env.example` to `.env`
2. login to instapaper in your browser and get the cookies via inspector (_hey, this is just a hack, ok_) and put them into your `.env`
3. run `node .`

As a result all your Instapaper articles from the "Home"-Folder that could be downloaded should appear as .pdf file in ./pdfs

# props

uses the binary from the ace [ReMarkable Cloud Go API](https://github.com/juruen/rmapi) to put the downloaded PDFs straight to the RM-Cloud. Please run `./rmapi` as stated in [ReMarkable Cloud Go API](https://github.com/juruen/rmapi) to auth.
