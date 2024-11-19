using my.bookshop as my from '../db/schema';
using from 'cds-spreadsheetimporter-plugin';

service CatalogService {
    entity Books as projection on my.Books;
    entity Authors as projection on my.Authors;
}
