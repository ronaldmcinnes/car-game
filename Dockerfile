# Use the official nginx image as base
FROM nginx:alpine

# Copy all game files to nginx html directory
COPY index.html /usr/share/nginx/html/
COPY styles.css /usr/share/nginx/html/
COPY game.js /usr/share/nginx/html/
COPY audio.js /usr/share/nginx/html/
COPY storage.js /usr/share/nginx/html/
COPY utils.js /usr/share/nginx/html/

# Expose port 80
EXPOSE 80

# nginx runs automatically when container starts
CMD ["nginx", "-g", "daemon off;"]

