FROM php:8.4-apache

# Thu vien he thong cho cac extension PHP ben duoi
RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip libzip-dev libicu-dev libonig-dev \
        libpng-dev libjpeg62-turbo-dev libfreetype6-dev libwebp-dev \
        libxml2-dev \
    && rm -rf /var/lib/apt/lists/*

RUN docker-php-ext-configure gd --with-freetype --with-jpeg --with-webp \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql mysqli gd zip intl bcmath exif opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Node: can cho `npm run build` (plugin wayfinder goi nguoc lai php artisan,
# nen Node va PHP phai nam chung mot container).
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

ENV APACHE_DOCUMENT_ROOT=/var/www/html/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/*.conf \
    && sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf \
    && a2enmod rewrite

RUN printf '%s\n' \
    'upload_max_filesize=64M' \
    'post_max_size=64M' \
    'memory_limit=512M' \
    'max_execution_time=300' \
    > /usr/local/etc/php/conf.d/zz-app.ini

WORKDIR /var/www/html
