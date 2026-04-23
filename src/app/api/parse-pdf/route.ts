import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    console.log('PDF Parse Request Received (v1 Legacy with Filtering)');

    let pdf;
    try {
        // Bypass buggy index.js that attempts to load test files
        // Require the implementation directly
        pdf = require('pdf-parse/lib/pdf-parse.js');
    } catch (e: any) {
        console.error('Library Load Error:', e);
        return NextResponse.json({
            error: '라이브러리 로드 실패',
            details: e.message
        }, { status: 500 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const startPage = parseInt(formData.get('startPage') as string) || 1;
        const endPage = parseInt(formData.get('endPage') as string) || 9999;

        if (!file) {
            return NextResponse.json({ error: '파일이 업로드되지 않았습니다.' }, { status: 400 });
        }

        console.log(`Processing file: ${file.name}, Target Pages: ${startPage}-${endPage}`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // pdf-parse v1 simple API with custom pagerender for filtering
        const options = {
            pagerender: function (pageData: any) {
                // pageData.pageIndex is 0-based
                // startPage and endPage are 1-based (from user input)
                const pageNum = pageData.pageIndex + 1;

                if (pageNum >= startPage && pageNum <= endPage) {
                    // Extract text from this page
                    return pageData.getTextContent()
                        .then(function (textContent: any) {
                            let lastY, text = '';
                            // Simple layout preservation strategy
                            // Concat strings, adding newline if Y position changes significantly
                            for (let item of textContent.items) {
                                if (lastY == item.transform[5] || !lastY) {
                                    text += item.str;
                                }
                                else {
                                    text += '\n' + item.str;
                                }
                                lastY = item.transform[5];
                            }
                            return text;
                        });
                }
                // Return empty string for skipped pages
                return '';
            }
        };

        const data = await pdf(buffer, options);

        console.log(`PDF Info: ${data.numpages} pages`);
        console.log('PDF Text extracted:', data.text.length, 'chars');

        return NextResponse.json({ text: data.text });

    } catch (error: any) {
        console.error('PDF Processing Error:', error);
        return NextResponse.json({
            error: 'PDF 처리 중 오류가 발생했습니다. (Processing failure)',
            details: error.message || error.toString()
        }, { status: 500 });
    }
}
