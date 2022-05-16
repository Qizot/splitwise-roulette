#!/bin/sh
SLACK_SIGNING_SECRET=$1
SLACK_TOKEN=$2
SPLITWISE_TOKEN=$3

gcloud functions deploy slack-handler  \
--runtime nodejs16 \
--trigger-http \
--allow-unauthenticated \
--set-env-vars "SLACK_SIGNING_SECRET=$SLACK_SIGNING_SECRET,SLACK_TOKEN=$SLACK_TOKEN,SPLITWISE_TOKEN=$SPLITWISE_TOKEN" \
--memory 128Mi