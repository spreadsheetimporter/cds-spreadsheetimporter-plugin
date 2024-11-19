using my.bookshop as my from './schema';

@odata.draft.enabled
annotate my.Books with @(
    UI: {
        LineItem: [
            {
                $Type : 'UI.DataField',
                Value : ID,
                Label : 'Book ID'
            },
            {
                $Type : 'UI.DataField',
                Value : title,
                Label : 'Book Title'
            },
            {
                $Type : 'UI.DataField',
                Value : stock,
                Label : 'Stock'
            }
        ],
        Identification: [ //Is the main field group
			{Value: createdBy, Label:'{i18n>Customer}'},
			{Value: createdAt, Label:'{i18n>Date}'},
			{Value: stock },
			{Value: title },
		],
        // Filtering capabilities
        SelectionFields: [
            ID,
            title,
            stock
        ]
    }
);