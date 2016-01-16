# cassbot

Slackbot for pulling in EVE CREST price information.

Usage:
Get the bot into a channel, and type '!price whateveritem'.

query is case insensitive.

whateveritem will turn into a query, so some queries will default too large.  A way around
that is to be more specific.  Another way around that is to include your own wildcard
submatching.

For example, !price plex gives you WAAAAAAY too many items.  So you can search for 
!price pilot%plex instead (which is what you probably wanted anyways).

