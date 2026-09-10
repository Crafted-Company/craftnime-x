package com.craftnime.app;

import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.media3.common.MediaItem;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.ui.PlayerView;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

public class PlayerActivity extends AppCompatActivity {
    private static final String TAG = "CraftnimePlayer";
    private ExoPlayer player;
    private PlayerView playerView;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE);
        hideSystemUI();

        setContentView(R.layout.activity_player);
        playerView = findViewById(R.id.player_view);

        String streamUrl = getIntent().getStringExtra("STREAM_URL");
        String title = getIntent().getStringExtra("TITLE");
        int epNum = getIntent().getIntExtra("EPISODE_NUMBER", 1);

        Log.e(TAG, "Starting Native Player for: " + title + " EP " + epNum + " => " + streamUrl);

        if (streamUrl != null && !streamUrl.isEmpty()) {
            initializePlayer(streamUrl);
        } else {
            finish();
        }
    }

    private void initializePlayer(String streamUrl) {
        try {
            Map<String, String> headers = new HashMap<>();
            headers.put("Referer", "https://anidb.app/");
            headers.put("Origin", "https://anidb.app");
            headers.put("Accept", "*/*");

            DefaultHttpDataSource.Factory httpDataSourceFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
                .setDefaultRequestProperties(headers)
                .setConnectTimeoutMs(15000)
                .setReadTimeoutMs(15000)
                .setAllowCrossProtocolRedirects(true);

            HlsMediaSource hlsMediaSource = new HlsMediaSource.Factory(httpDataSourceFactory)
                .setAllowChunklessPreparation(true)
                .createMediaSource(MediaItem.fromUri(Uri.parse(streamUrl)));

            player = new ExoPlayer.Builder(this).build();
            playerView.setPlayer(player);
            playerView.setKeepScreenOn(true);

            player.addListener(new Player.Listener() {
                @Override
                public void onPlaybackStateChanged(int playbackState) {
                    if (playbackState == Player.STATE_READY) {
                        Log.e(TAG, "Native Player: STREAM READY & PLAYING");
                    } else if (playbackState == Player.STATE_ENDED) {
                        Log.e(TAG, "Native Player: STREAM ENDED");
                    }
                }

                @Override
                public void onPlayerError(PlaybackException error) {
                    Log.e(TAG, "Native Player Error: ", error);
                }
            });

            player.setMediaSource(hlsMediaSource);
            player.prepare();
            player.setPlayWhenReady(true);
        } catch (Exception e) {
            Log.e(TAG, "Failed to initialize native player", e);
        }
    }

    private void hideSystemUI() {
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            getWindow().getAttributes().layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (player != null) {
            player.pause();
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }
}
