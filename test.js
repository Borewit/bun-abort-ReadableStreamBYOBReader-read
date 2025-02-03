//import {describe, it} from 'node:test';
import process from 'node:process';

async function getTestModule() {
    if (process.versions.bun) {
        return await import('bun:test');
    }
    return await import('node:test');
}

// Create a ReadableStream with a delayed chunk
function createWebReadableStream() {

    let cancelled = false;
    return new ReadableStream({
        type: "bytes", // Indicate this is a byte stream
        start(controller) {
            // Simulate delayed chunk
            setTimeout(() => {
                if (!cancelled) {
                    const chunk = new Uint8Array([72, 101, 108, 108]);
                    if (controller.byobRequest) {
                        const view = controller.byobRequest.view;
                        view.set(chunk.subarray(0, view.byteLength)); // Fill the buffer
                        controller.byobRequest.respond(view.byteLength);
                    } else {
                        controller.enqueue(chunk);
                    }
                }
            }, 100); // Delay to keep read pending
        },
        cancel(reason) {
            cancelled = true;
            console.log(`Stream was canceled: ${reason}`);
        }
    });
}

async function runTests() {

    const {describe, it} = await getTestModule();

    describe('Cancel async read operation on ReadableStream', () => {

        it('cancel ReadableStreamDefaultReader', async function () {

            const webReadableStream = createWebReadableStream();
            try {
                // Get the reader
                const readableStreamDefaultReader = webReadableStream.getReader();
                try
                {
                    // Start a read operation
                    console.log("Reading from ReadableStreamDefaultReader...");
                    const readPromise = readableStreamDefaultReader.read()
                        .then(result => {
                            console.log("Read resolved:", result);
                        })
                        .catch(error => {
                            console.log("Read rejected due to cancel:", error);
                        });

                    // Cancel the reader while the read is pending
                    console.log("Cancelling reader...");
                    await readableStreamDefaultReader.cancel("Canceling the reader while reading.");

                    // Wait to observe the result
                    await readPromise;
                } finally {
                    readableStreamDefaultReader.releaseLock();
                }
            } finally {
                await webReadableStream.cancel();
            }
        });

        it('cancel ReadableStreamBYOBReader', async function () {

            const webReadableStream = createWebReadableStream();
            try {
                // Get the reader
                const readableStreamDefaultReader = webReadableStream.getReader({mode: "byob"});
                try
                {
                    // Start a read operation
                    console.log("Reading from ReadableStreamBYOBReader...");
                    const buffer = new Uint8Array(4);
                    const readPromise = readableStreamDefaultReader.read(buffer)
                        .then(result => {
                            console.log("Read resolved:", result);
                        })
                        .catch(error => {
                            console.log("Read rejected due to cancel:", error);
                        });

                    // Cancel the reader while the read is pending
                    console.log("Cancelling reader...");
                    await readableStreamDefaultReader.cancel("Canceling the reader while reading.");

                    // Wait to observe the result
                    await readPromise;
                } finally {
                    readableStreamDefaultReader.releaseLock();
                }
            } finally {
                await webReadableStream.cancel();
            }
        });

    });
}
runTests();


