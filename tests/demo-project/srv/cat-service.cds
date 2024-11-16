using my.bookshop as my from '../db/schema';
using from 'cds-spreadsheetimporter-plugin';

service CatalogService {
    @readonly entity Books as projection on my.Books;
}
