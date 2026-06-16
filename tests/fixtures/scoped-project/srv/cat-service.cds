using scoped.bookshop as scoped from '../db/schema';
using from 'cds-spreadsheetimporter-plugin';

service CatalogService {
  @spreadsheetimporter.enabled
  entity Books as projection on scoped.Books;

  entity Authors as projection on scoped.Authors;
}
