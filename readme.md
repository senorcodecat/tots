# TOTS
a cute little social network

* share short thoughts and pics
* follow friends
* fave stuff
* get fun notifications
* chat (sorta)
* edit your own posts!
* no nazis
* no algorithmic feeds
* not a customer support and marketing platform for big brands



DONE:

* Auth0 auth - free tier allows 7000 users
* mongodb - free tier on mlab 500mb!
* .env file
* optionally require http auth for private
* able to post text
* able to user view posts
* able to view firehose
* able to fave
* view faves page
* able to follow/unfollow
* able to view feed
* hashtags
* search
* editable usernames
* files
* fave counts
* post permalinks
* replies
* edit posts
* edit profile images
* link unfurling header things

* autorotate images when uploaded
* @mentions - http://ment.io/
* user profile fails to render reply text
* fix post editing w/rt mentions
* ensure usernames do not have spaces!
* nav bar thing
* ability to toggle live mode
* online/offline indicator
* don't show paginators until stuff is loaded
* protect against double post
* loading states
* list of live things as sidebar on feed
* live count in feed
* livemode should auto-close after a few hours


LIVE MODE

* display current post to left of chat on bigger screens?
* display all live posts to left of chat on bigger screens?

* header for roster
* when livemode ends, post a notification with a summary.
    -> maybe needs to capture start and end?
    -> Live chat lasted 20 minutes, during which 5 people left 12 replies
* in live mode put post to left of chat?

* toggling live mode should not not make a revision
* handle failure to send message to socket
* probably need to reload message history on reconnect or attempt some "since" sync

SMS BOT
TEXT TOTS: (347) 273-8687
* Add and verify phone number
* send vcard
* ability to post via sms
* opt in to notifications for GO LIVES



TODO:
* zoom in on images
* images in comments
* edit comments
* edit profile on mobile is super ugly
* edit posts on mobile is EVEN UGLIER
* empty state for profile
* empty state for search
* delete post
* square crop avatar images
* remove pics from post
* change pics on post
* last read marker
* view followers
* view following
* capture / upload profile images on signup
* blocking
* reporting
* prevent abuse of SMS verification


BORING:
admin mode

FAR OUT:
sms?
personalized notification webhooks
default signups OFF, enable with flag
ability to federate / follow someone on a different instance
identity verification - same username != same user
[Deploy to Glitch]
