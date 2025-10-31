#!/bin/bash

# Coda Page Creator Script
# Usage: ./create_coda_page.sh "CODA_URL" "New Page Name" "api_key"

# Check if required arguments are provided
if [ "$#" -lt 2 ]; then
    echo "Usage:"
    echo "1. find or ask an API key with Doc Creator permissions"
    echo "2. copy a page where you want to create a new page URL, use it as the third argument or an environment var CODA_API_KEY"
    echo "3. $0 <coda_url> <page_name> <api_key>"
    echo "Example: $0 'https://coda.io/d/QF-Network_df6rzXCWZj8/Web3-developer-UI_suU0kGyy' 'My New Page'"
    exit 1
fi

CODA_URL="$1"
PAGE_NAME="$2"
API_KEY="${3:-$CODA_API_KEY}"  # Use third argument or environment variable

# Check if API key is set
if [ -z "$API_KEY" ]; then
    echo "Error: API key not provided. Set CODA_API_KEY environment variable or pass as third argument."
    exit 1
fi

# Extract doc ID from URL (everything after _d until next / or end)
DOC_ID=$(echo "$CODA_URL" | sed -n 's/.*_d\([^/]*\).*/\1/p')

if [ -z "$DOC_ID" ]; then
    echo "Error: Could not extract doc ID from URL"
    exit 1
fi

echo "Extracted Doc ID: $DOC_ID"

# Check if URL contains a page reference (_su pattern)
PARENT_PAGE_ID=""
if echo "$CODA_URL" | grep -q "_su"; then
    echo "Page reference found in URL. Resolving to full page ID..."

    # URL encode the Coda URL for the API call
    ENCODED_URL=$(printf %s "$CODA_URL" | jq -sRr @uri)

    # Resolve the browser link to get the actual page ID
    RESOLVE_RESPONSE=$(curl -s -X GET "https://coda.io/apis/v1/resolveBrowserLink?url=$ENCODED_URL" \
        -H "Authorization: Bearer $API_KEY")

    # Extract the page ID from the response
    PARENT_PAGE_ID=$(echo "$RESOLVE_RESPONSE" | jq -r '.resource.id // empty')

    if [ -z "$PARENT_PAGE_ID" ]; then
        echo "Warning: Could not resolve page ID from URL. Creating page at doc root."
        echo "Response: $RESOLVE_RESPONSE"
    else
        echo "Resolved Parent Page ID: $PARENT_PAGE_ID"
    fi
fi

# Build the JSON payload
if [ -n "$PARENT_PAGE_ID" ]; then
    PAYLOAD=$(jq -n \
        --arg name "$PAGE_NAME" \
        --arg parentId "$PARENT_PAGE_ID" \
        '{name: $name, parentPageId: $parentId}')
    echo "Creating subpage under parent: $PARENT_PAGE_ID"
else
    PAYLOAD=$(jq -n \
        --arg name "$PAGE_NAME" \
        '{name: $name}')
    echo "Creating page at doc root"
fi

echo "Payload: $PAYLOAD"

# Create the page
echo "Creating page..."
CREATE_RESPONSE=$(curl -s -X POST "https://coda.io/apis/v1/docs/$DOC_ID/pages" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD")

# Check if creation was successful
REQUEST_ID=$(echo "$CREATE_RESPONSE" | jq -r '.requestId // empty')
NEW_PAGE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.id // empty')

if [ -n "$NEW_PAGE_ID" ]; then
    echo "✓ Success! Page created with ID: $NEW_PAGE_ID"
    echo "✓ Request ID: $REQUEST_ID"

    # Construct the browser link
    BROWSER_LINK="https://coda.io/d/_d${DOC_ID}/_${NEW_PAGE_ID#canvas-}"
    echo "✓ Page URL: $BROWSER_LINK"
else
    echo "✗ Error creating page:"
    echo "$CREATE_RESPONSE" | jq .
    exit 1
fi
