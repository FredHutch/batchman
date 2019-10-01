FROM nickgryg/alpine-pandas

COPY requirements.txt /requirements.txt

RUN \
 apk add --no-cache postgresql-libs xmlsec-dev && \
 apk add --no-cache --virtual .build-deps gcc musl-dev postgresql-dev && \
 apk add --no-cache git && \
 python3 -m pip install -r /requirements.txt && \
 apk --purge del .build-deps

RUN apk add --update nodejs nodejs-npm
RUN apk add --no-cache bash postgresql-libs tzdata

RUN mkdir /app && mkdir /install && mkdir /migrations
WORKDIR /install

# COPY ./frontend /install
# RUN npm install --unsafe-perm
# RUN npm run build && mv build/ /app

# Copy application files and assets
COPY ./app /app
COPY ./migrations /migrations
COPY Procfile /

RUN ln -fs /usr/share/zoneinfo/Etc/UTC /etc/localtime

WORKDIR /

EXPOSE 8000

