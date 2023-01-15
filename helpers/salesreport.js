const PDFDocument = require("pdfkit-table");
const fs = require('fs');

function getSalesReport(Details) {
    return new Promise((resolve, reject) => {


        var doc = new PDFDocument();

        var data = Details.map(function (item, index) {
            return [index + 1, item._id, item.total, item.orderCount, item.productQty];
        });
        const table = {
            title: "Sales report",
            subtitle: "Sales report based on each month",
            headers: ["No", "Month", "Amount", "Orders", "Proudcts Sold"],
            rows: data,
        };

        doc.table(table,);

        doc.pipe(fs.createWriteStream('./public/salesreport/report.pdf'));
        doc.end();

        resolve(true);
    })
}


module.exports = getSalesReport;