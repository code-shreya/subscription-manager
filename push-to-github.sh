#!/bin/bash

echo "🚀 Pushing SubManager to GitHub..."
echo ""
echo "📝 You'll need to enter your GitHub credentials:"
echo "   Username: code-shreya"
echo "   Password: [Your GitHub Personal Access Token]"
echo ""
echo "💡 Don't have a token? Get one here:"
echo "   https://github.com/settings/tokens/new?scopes=repo&description=SubManager"
echo ""
echo "Press Enter to continue..."
read

cd ~/subscription-manager

# Push to GitHub
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🌐 Your changes are now live at:"
    echo "   https://github.com/code-shreya/subscription-manager"
    echo ""
    echo "🚀 Render will automatically deploy your changes in ~2-3 minutes"
    echo ""
    echo "📸 Share your project:"
    echo "   Landing Page: [Your Render URL]"
    echo "   GitHub: https://github.com/code-shreya/subscription-manager"
else
    echo ""
    echo "❌ Push failed. Please check your credentials and try again."
fi
